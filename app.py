import streamlit as st
import os
import base64
import requests
import concurrent.futures
import io
from PIL import Image
from google import genai
from google.genai import types
from streamlit_drawable_canvas import st_canvas

st.set_page_config(page_title="Multi-Aspect Image Generator & Magic Edit", layout="wide")

st.title("Multi-Aspect Image Generator & Magic Edit")
st.markdown("Generate images concurrently or use Magic Edit to paint a mask and modify specific areas.")

if "results" not in st.session_state:
    st.session_state.results = []

# Sidebar for settings
with st.sidebar:
    st.header("Settings")
    api_key = st.text_input("Gemini API Key", type="password", value=os.environ.get("GEMINI_API_KEY", ""))
    
    st.subheader("Global Parameters")
    model = st.selectbox("Model", ["gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"])
    
    st.subheader("Cloudinary Settings (Optional)")
    cloud_name = st.text_input("Cloud Name")
    upload_preset = st.text_input("Upload Preset")

def upload_to_cloudinary(base64_data, mime_type, cloud_name, upload_preset):
    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    data_uri = f"data:{mime_type};base64,{base64_data}"
    payload = {
        "file": data_uri,
        "upload_preset": upload_preset
    }
    response = requests.post(url, data=payload)
    return response.json()

def generate_single_image(client, model, contents, aspect_ratio, image_size, index):
    try:
        result = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=image_size
                )
            )
        )
        for part in result.candidates[0].content.parts:
            if part.inline_data:
                return {
                    "id": f"gen-{index}",
                    "data": part.inline_data.data,
                    "mime_type": part.inline_data.mime_type,
                    "aspect_ratio": aspect_ratio,
                    "status": "success"
                }
        return {"id": f"gen-{index}", "status": "error", "error": "No image returned"}
    except Exception as e:
        return {"id": f"gen-{index}", "status": "error", "error": str(e)}

tab1, tab2 = st.tabs(["✨ Generate Images", "🖌️ Magic Edit"])

with tab1:
    st.header("Generate Images")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        aspect_ratio = st.selectbox("Aspect Ratio", [
            "1:1", "16:9", "9:16", "4:3", "3:4", 
            "1:4", "4:1", "1:8", "8:1"
        ], index=0, help="1:4 is iPhone Portrait/Extra Tall. 4:1 is Extra Wide.")
    with col2:
        image_size = st.selectbox("Quality (Resolution)", ["1K", "2K", "4K"])
    with col3:
        num_images = st.number_input("Number of Images", min_value=1, max_value=4, value=4, help="Generates concurrently (Max 4).")
        
    prompt = st.text_area("Enter your prompt", height=100, key="gen_prompt")

    uploaded_files = st.file_uploader("Upload Reference Images (Max 10)", accept_multiple_files=True, type=['png', 'jpg', 'jpeg', 'webp'], key="gen_files")
    if len(uploaded_files) > 10:
        st.warning("You can only use up to 10 reference images. Only the first 10 will be used.")
        uploaded_files = uploaded_files[:10]

    if uploaded_files:
        st.write("Reference Images:")
        cols = st.columns(min(len(uploaded_files), 5))
        for i, file in enumerate(uploaded_files):
            cols[i % 5].image(file, use_container_width=True)

    if st.button("Generate Images", type="primary", key="btn_gen"):
        if not api_key:
            st.error("Please enter your Gemini API Key in the sidebar.")
        elif not prompt and not uploaded_files:
            st.warning("Please enter a prompt or upload reference images.")
        else:
            client = genai.Client(api_key=api_key)
            
            contents = []
            if prompt:
                contents.append(prompt)
            
            for file in uploaded_files:
                file_bytes = file.read()
                contents.append(
                    types.Part.from_bytes(
                        data=file_bytes,
                        mime_type=file.type
                    )
                )
            
            st.session_state.results = []
            
            with st.spinner(f"Generating {num_images} images concurrently..."):
                with concurrent.futures.ThreadPoolExecutor(max_workers=num_images) as executor:
                    futures = []
                    for i in range(num_images):
                        futures.append(executor.submit(generate_single_image, client, model, contents, aspect_ratio, image_size, i))
                    
                    for future in concurrent.futures.as_completed(futures):
                        st.session_state.results.append(future.result())

    # Display results
    if st.session_state.results:
        cols = st.columns(2)
        for i, res in enumerate(st.session_state.results):
            with cols[i % 2]:
                if res["status"] == "success":
                    # Streamlit natively supports enlarging images when clicked
                    st.image(res["data"], caption=f"Image ({res['aspect_ratio']})", use_container_width=True)
                    
                    col_a, col_b = st.columns(2)
                    with col_a:
                        b64_img = base64.b64encode(res["data"]).decode('utf-8')
                        href = f'<a href="data:{res["mime_type"]};base64,{b64_img}" download="generated-{res["id"]}.png" style="text-decoration:none;"><button style="width:100%; padding:0.5rem; border-radius:0.5rem; border:1px solid #ccc; background:white; cursor:pointer;">Download</button></a>'
                        st.markdown(href, unsafe_allow_html=True)
                    
                    with col_b:
                        if st.button(f"Upscale to 4K", key=f"upscale_{res['id']}"):
                            with st.spinner("Upscaling to 4K..."):
                                try:
                                    client = genai.Client(api_key=api_key)
                                    upscale_contents = [
                                        types.Part.from_bytes(data=res["data"], mime_type=res["mime_type"]),
                                        "Upscale to 4K resolution, enhance details, maintain exact composition"
                                    ]
                                    up_res = client.models.generate_content(
                                        model=model,
                                        contents=upscale_contents,
                                        config=types.GenerateContentConfig(
                                            image_config=types.ImageConfig(
                                                aspect_ratio=res["aspect_ratio"],
                                                image_size="4K"
                                            )
                                        )
                                    )
                                    for part in up_res.candidates[0].content.parts:
                                        if part.inline_data:
                                            res["data"] = part.inline_data.data
                                            res["mime_type"] = part.inline_data.mime_type
                                            st.success("Upscaled successfully!")
                                            st.rerun()
                                except Exception as e:
                                    st.error(f"Upscale failed: {e}")
                    
                    if cloud_name and upload_preset:
                        if st.button("Upload to Cloudinary", key=f"cloud_{res['id']}"):
                            with st.spinner("Uploading..."):
                                b64_img = base64.b64encode(res["data"]).decode('utf-8')
                                upload_res = upload_to_cloudinary(b64_img, res["mime_type"], cloud_name, upload_preset)
                                if "secure_url" in upload_res:
                                    st.success(f"Uploaded: {upload_res['secure_url']}")
                                else:
                                    st.error("Cloudinary upload failed.")
                else:
                    st.error(res.get("error", "Unknown error"))

with tab2:
    st.header("Magic Edit")
    st.markdown("Upload an image, paint over the area you want to change, and describe the edit.")
    
    edit_prompt = st.text_area("Edit Prompt", placeholder="e.g., Add a cute cat sitting on the table", height=100, key="edit_prompt")
    
    edit_file = st.file_uploader("Upload Image to Edit", type=['png', 'jpg', 'jpeg', 'webp'], key="edit_file")
    
    if edit_file:
        img = Image.open(edit_file)
        
        # Calculate canvas size to fit screen but keep aspect ratio
        canvas_width = 700
        canvas_height = int(canvas_width * (img.height / img.width))
        
        st.write("Draw over the area you want to edit (this creates a mask):")
        
        canvas_result = st_canvas(
            fill_color="rgba(255, 255, 255, 1)",
            stroke_width=30,
            stroke_color="rgba(255, 255, 255, 1)",
            background_image=img,
            update_streamlit=True,
            height=canvas_height,
            width=canvas_width,
            drawing_mode="freedraw",
            key="canvas",
        )
        
        if st.button("Apply Magic Edit", type="primary", key="btn_edit"):
            if not api_key:
                st.error("Please enter your Gemini API Key in the sidebar.")
            elif not edit_prompt:
                st.warning("Please enter an edit prompt.")
            elif canvas_result.image_data is None:
                st.warning("Please draw a mask on the image.")
            else:
                with st.spinner("Applying Magic Edit..."):
                    try:
                        # Extract alpha channel as mask
                        mask_array = canvas_result.image_data[:, :, 3]
                        mask_img = Image.fromarray(mask_array).convert("L")
                        
                        # Convert original image to bytes
                        img_byte_arr = io.BytesIO()
                        img.save(img_byte_arr, format='PNG')
                        img_bytes = img_byte_arr.getvalue()
                        
                        # Convert mask to bytes
                        mask_byte_arr = io.BytesIO()
                        mask_img.save(mask_byte_arr, format='PNG')
                        mask_bytes = mask_byte_arr.getvalue()
                        
                        client = genai.Client(api_key=api_key)
                        contents = [
                            types.Part.from_bytes(data=img_bytes, mime_type="image/png"),
                            types.Part.from_bytes(data=mask_bytes, mime_type="image/png"),
                            f"{edit_prompt}. This is an inpainting request. The second image is a mask where the white areas indicate the region to be edited."
                        ]
                        
                        result = client.models.generate_content(
                            model=model,
                            contents=contents,
                            config=types.GenerateContentConfig(
                                image_config=types.ImageConfig(
                                    image_size="1K" # Default size for edits
                                )
                            )
                        )
                        
                        edited_data = None
                        edited_mime = None
                        for part in result.candidates[0].content.parts:
                            if part.inline_data:
                                edited_data = part.inline_data.data
                                edited_mime = part.inline_data.mime_type
                                break
                        
                        if edited_data:
                            st.success("Edit complete!")
                            st.image(edited_data, caption="Edited Image", use_container_width=True)
                            
                            b64_img = base64.b64encode(edited_data).decode('utf-8')
                            href = f'<a href="data:{edited_mime};base64,{b64_img}" download="magic-edit.png" style="text-decoration:none;"><button style="padding:0.5rem 1rem; border-radius:0.5rem; border:1px solid #ccc; background:white; cursor:pointer;">Download Edited Image</button></a>'
                            st.markdown(href, unsafe_allow_html=True)
                        else:
                            st.error("No image returned from the model.")
                            
                    except Exception as e:
                        st.error(f"Magic Edit failed: {str(e)}")
