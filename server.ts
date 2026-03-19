import express from "express";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary with user's credentials
cloudinary.config({
  
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/folders", async (req, res) => {
    try {
      // Fetch root folders
      const result = await cloudinary.api.root_folders();
      const folders = result.folders.map((f: any) => f.name);
      
      // Ensure "start" folder exists in the list
      if (!folders.includes("start")) {
        folders.push("start");
      }
      
      // Ensure "MAI with Edit" folder exists in the list
      if (!folders.includes("MAI with Edit")) {
        try {
          await cloudinary.api.create_folder("MAI with Edit");
          folders.push("MAI with Edit");
        } catch (e) {
          console.error("Failed to create MAI with Edit folder", e);
        }
      }
      
      res.json(folders);
    } catch (error: any) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const { folder } = req.body;
      if (!folder) {
        return res.status(400).json({ error: "Folder name is required" });
      }
      await cloudinary.api.create_folder(folder);
      res.json({ success: true, folder });
    } catch (error: any) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  app.post("/api/upload", async (req, res) => {
    try {
      const { image, folder } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const targetFolder = folder || "start";
      
      const result = await cloudinary.uploader.upload(image, {
        folder: targetFolder,
      });
      
      res.json({ secure_url: result.secure_url });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.get("/api/images/:folder", async (req, res) => {
    try {
      const { folder } = req.params;
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder + '/',
        max_results: 50
      });
      
      res.json(result.resources.map((r: any) => ({
        url: r.secure_url,
        public_id: r.public_id,
        created_at: r.created_at
      })));
    } catch (error: any) {
      console.error("Error fetching images:", error);
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
