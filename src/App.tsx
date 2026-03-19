import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Image as ImageIcon, Settings, Download, UploadCloud, CheckCircle2, AlertCircle, X, Upload, XCircle, Maximize, Wand2, Paintbrush } from 'lucide-react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  return (
    <ApiKeyCheck>
      <MainApp />
    </ApiKeyCheck>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<'generate' | 'magic-edit' | 'folders'>('generate');
  const [showSettings, setShowSettings] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [model, setModel] = useState("gemini-3.1-flash-image-preview");
  
  const [folders, setFolders] = useState<string[]>(['start']);
  const [selectedFolder, setSelectedFolder] = useState<string>('start');
  const [newFolder, setNewFolder] = useState('');

  useEffect(() => {
    fetch('/api/folders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFolders(data);
        }
      })
      .catch(err => console.error("Failed to fetch folders", err));
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolder.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: newFolder.trim() })
      });
      if (res.ok) {
        setFolders(prev => [...new Set([...prev, newFolder.trim()])]);
        setSelectedFolder(newFolder.trim());
        setNewFolder('');
      }
    } catch (err) {
      console.error("Failed to create folder", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1117] text-white font-sans pb-12">
      <header className="bg-[#262730] border-b border-[#31333F] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#FF4B4B]" />
            <h1 className="text-xl font-semibold tracking-tight">Multi-Aspect Generator</h1>
          </div>
          <div className="flex bg-[#31333F] p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'generate' ? 'bg-[#262730] shadow-sm text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Generate
            </button>
            <button 
              onClick={() => setActiveTab('magic-edit')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${activeTab === 'magic-edit' ? 'bg-[#262730] shadow-sm text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Wand2 className="w-4 h-4" /> Magic Edit
            </button>
            <button 
              onClick={() => setActiveTab('folders')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${activeTab === 'folders' ? 'bg-[#262730] shadow-sm text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <UploadCloud className="w-4 h-4" /> Folders
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={model} 
            onChange={e => setModel(e.target.value)} 
            className="p-2 border border-[#31333F] rounded-lg bg-[#0e1117] focus:ring-2 focus:ring-[#FF4B4B] outline-none text-sm"
          >
            <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image</option>
            <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image</option>
            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
          </select>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:bg-[#31333F] rounded-full transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {activeTab === 'generate' ? (
          <GenerateTab 
            model={model} 
            folders={folders}
            selectedFolder={selectedFolder} 
            setSelectedFolder={setSelectedFolder}
            onEnlarge={setEnlargedImage} 
          />
        ) : activeTab === 'magic-edit' ? (
          <MagicEditTab 
            model={model} 
            folders={folders}
            selectedFolder={selectedFolder} 
            setSelectedFolder={setSelectedFolder}
            onEnlarge={setEnlargedImage} 
          />
        ) : (
          <FoldersTab 
            folders={folders}
            onEnlarge={setEnlargedImage}
          />
        )}
      </main>

      {/* Lightbox */}
      {enlargedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} className="max-w-full max-h-full object-contain rounded-lg" alt="Enlarged preview" />
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#262730] rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-[#31333F] flex items-center justify-between">
              <h2 className="text-lg font-semibold">Settings & Storage</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-white mb-1">Cloudinary Storage Folder</h3>
                <p className="text-xs text-gray-500 mb-4">Choose where generated images are saved.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Select Default Folder</label>
                    <select 
                      value={selectedFolder}
                      onChange={e => setSelectedFolder(e.target.value)}
                      className="w-full px-3 py-2 border border-[#31333F] rounded-lg text-sm focus:ring-2 focus:ring-[#FF4B4B] outline-none"
                    >
                      {folders.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Create New Folder</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newFolder}
                        onChange={e => setNewFolder(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#31333F] rounded-lg text-sm focus:ring-2 focus:ring-[#FF4B4B] outline-none"
                        placeholder="e.g. project-x"
                      />
                      <button 
                        onClick={handleCreateFolder}
                        disabled={!newFolder.trim()}
                        className="bg-[#FF4B4B] hover:bg-[#FF6B6B] disabled:bg-[#FF4B4B]/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerateTab({ model, folders, selectedFolder, setSelectedFolder, onEnlarge }: { model: string, folders: string[], selectedFolder: string, setSelectedFolder: (f: string) => void, onEnlarge: (url: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Array<{id: string, aspectRatio: string, url: string, status: string, error?: string, cloudinaryUrl?: string}>>([]);
  const [referenceImages, setReferenceImages] = useState<{data: string, mimeType: string, url: string}[]>([]);
  const [numImages, setNumImages] = useState(4);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (referenceImages.length + files.length > 10) {
      alert("You can only upload up to 10 reference images.");
      return;
    }
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const data = base64String.split(',')[1];
        setReferenceImages(prev => [...prev, {
          data,
          mimeType: file.type,
          url: base64String
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (base64Image: string, id: string) => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, folder: selectedFolder })
      });
      const data = await res.json();
      if (data.secure_url) {
        setResults(prev => prev.map(r => r.id === id ? { ...r, cloudinaryUrl: data.secure_url } : r));
      }
    } catch (err) {
      console.error("Cloudinary upload error:", err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && referenceImages.length === 0) return;
    setIsGenerating(true);
    
    const initialResults = Array.from({ length: numImages }).map((_, i) => ({
      id: `gen-${Date.now()}-${i}`,
      aspectRatio,
      url: '',
      status: 'generating'
    }));
    setResults(initialResults);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
    const parts: any[] = [];
    if (prompt.trim()) parts.push({ text: prompt });
    referenceImages.forEach(img => {
      parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
    });

    const promises = initialResults.map(async (initRes) => {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: imageSize as any
            }
          }
        });
        
        let base64Image = '';
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
        
        if (base64Image) {
          setResults(prev => prev.map(r => r.id === initRes.id ? { ...r, url: base64Image, status: 'success' } : r));
          await uploadToCloudinary(base64Image, initRes.id);
        } else {
          setResults(prev => prev.map(r => r.id === initRes.id ? { ...r, status: 'error', error: 'No image returned' } : r));
        }
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.message?.includes("Requested entity was not found") 
          ? 'API Key error. Please refresh and re-select your key.' 
          : err.message || 'Generation failed';
        setResults(prev => prev.map(r => r.id === initRes.id ? { ...r, status: 'error', error: errorMsg } : r));
      }
    });

    await Promise.all(promises);
    setIsGenerating(false);
  };

  const handleUpscale = async (id: string) => {
    const target = results.find(r => r.id === id);
    if (!target || !target.url || target.status === 'upscaling') return;

    setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'upscaling' } : r));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const base64Data = target.url.split(',')[1];
      const mimeType = target.url.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: "Upscale to 4K resolution, enhance details, maintain exact composition" }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: target.aspectRatio as any,
            imageSize: "4K"
          }
        }
      });

      let newBase64Image = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newBase64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (newBase64Image) {
        setResults(prev => prev.map(r => r.id === id ? { ...r, url: newBase64Image, status: 'success' } : r));
        await uploadToCloudinary(newBase64Image, id);
      } else {
        setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'error', error: 'Upscale returned no image' } : r));
      }
    } catch (err: any) {
      console.error(err);
      setResults(prev => prev.map(r => r.id === id ? { ...r, status: 'error', error: err.message || 'Upscale failed' } : r));
    }
  };

  return (
    <>
      <div className="bg-[#262730] rounded-2xl shadow-sm border border-[#31333F] p-6 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Image Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full h-24 p-4 bg-[#0e1117] border border-[#31333F] rounded-xl focus:ring-2 focus:ring-[#FF4B4B] focus:border-[#FF4B4B] outline-none resize-none transition-all"
            disabled={isGenerating}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
            <select 
              value={aspectRatio} 
              onChange={e => setAspectRatio(e.target.value)} 
              className="w-full p-2.5 border border-[#31333F] rounded-xl bg-[#0e1117] focus:ring-2 focus:ring-[#FF4B4B] outline-none text-sm"
              disabled={isGenerating}
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="3:4">3:4 (Vertical)</option>
              <option value="1:4">1:4 (iPhone Portrait / Extra Tall)</option>
              <option value="4:1">4:1 (Extra Wide)</option>
              <option value="1:8">1:8 (Ultra Tall)</option>
              <option value="8:1">8:1 (Ultra Wide)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quality</label>
            <select 
              value={imageSize} 
              onChange={e => setImageSize(e.target.value)} 
              className="w-full p-2.5 border border-[#31333F] rounded-xl bg-[#0e1117] focus:ring-2 focus:ring-[#FF4B4B] outline-none text-sm"
              disabled={isGenerating}
            >
              <option value="1K">1K (Standard)</option>
              <option value="2K">2K (High)</option>
              <option value="4K">4K (Ultra)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Number of Images</label>
            <select 
              value={numImages} 
              onChange={e => setNumImages(Number(e.target.value))} 
              className="w-full p-2.5 border border-[#31333F] rounded-xl bg-[#0e1117] focus:ring-2 focus:ring-[#FF4B4B] outline-none text-sm"
              disabled={isGenerating}
            >
              {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Save to Folder</label>
            <select 
              value={selectedFolder} 
              onChange={e => setSelectedFolder(e.target.value)} 
              className="w-full p-2.5 border border-[#31333F] rounded-xl bg-[#0e1117] focus:ring-2 focus:ring-[#FF4B4B] outline-none text-sm"
              disabled={isGenerating}
            >
              {folders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Reference Images (Max 10)</label>
          <div className="flex flex-wrap gap-3">
            {referenceImages.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg border border-[#31333F] overflow-hidden group shadow-sm">
                <img src={img.url} alt="ref" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(i)} 
                  className="absolute top-1 right-1 bg-[#262730]/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
            {referenceImages.length < 10 && (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[#31333F] flex flex-col items-center justify-center cursor-pointer hover:bg-[#0e1117] hover:border-[#FF4B4B] transition-colors">
                <Upload className="w-5 h-5 text-gray-500 mb-1" />
                <span className="text-[10px] text-gray-500 font-medium">Upload</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={isGenerating} />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-[#31333F] pt-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && referenceImages.length === 0)}
            className="bg-[#FF4B4B] hover:bg-[#FF6B6B] disabled:bg-[#FF4B4B]/50 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating Concurrently...</>
            ) : 'Generate Images'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((result, i) => {
            const isPending = result.status === 'generating';
            const isUpscaling = result.status === 'upscaling';
            
            return (
              <div key={result.id} className="bg-[#262730] rounded-2xl shadow-sm border border-[#31333F] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-[#31333F] bg-[#0e1117]/50 flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-300">
                    Image {i + 1} <span className="text-gray-500 font-normal">({result.aspectRatio})</span>
                  </span>
                  {result.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {result.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {(isPending || isUpscaling) && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                </div>
                
                <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[300px] bg-[#0e1117]">
                  {result.status === 'success' || isUpscaling ? (
                    <div className="w-full flex flex-col items-center gap-4">
                      <div className="relative w-full flex justify-center group">
                        <img 
                          src={result.url} 
                          alt={`Generated ${i+1}`} 
                          className={`max-w-full max-h-[400px] object-contain rounded-lg shadow-sm transition-opacity ${isUpscaling ? 'opacity-50' : 'opacity-100'}`}
                          referrerPolicy="no-referrer"
                        />
                        {!isUpscaling && (
                          <button 
                            onClick={() => onEnlarge(result.url)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Enlarge"
                          >
                            <Maximize className="w-5 h-5" />
                          </button>
                        )}
                        {isUpscaling && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-[#262730]/90 px-4 py-2 rounded-full shadow-md flex items-center gap-2 text-sm font-medium text-[#FF4B4B]">
                              <Loader2 className="w-4 h-4 animate-spin" /> Upscaling to 4K...
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 w-full">
                        <a 
                          href={result.url} 
                          download={`generated-${result.aspectRatio.replace(':', '-')}-${i+1}.png`}
                          className="flex-1 flex items-center justify-center gap-2 bg-[#262730] border border-[#31333F] hover:bg-[#0e1117] text-gray-300 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download className="w-4 h-4" /> Download
                        </a>
                        <button
                          onClick={() => handleUpscale(result.id)}
                          disabled={isUpscaling}
                          className="flex-1 flex items-center justify-center gap-2 bg-indigo-900/30 hover:bg-indigo-100 text-indigo-300 border border-indigo-800 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Maximize className="w-4 h-4" /> Upscale 4K
                        </button>
                        {result.cloudinaryUrl && (
                          <a 
                            href={result.cloudinaryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-emerald-900/30 hover:bg-emerald-100 text-emerald-300 border border-emerald-800 py-2 px-3 rounded-lg text-sm font-medium transition-colors mt-1"
                          >
                            <UploadCloud className="w-4 h-4" /> Cloudinary Link
                          </a>
                        )}
                      </div>
                    </div>
                  ) : result.status === 'error' ? (
                    <div className="text-center text-red-500 p-4">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{result.error}</p>
                    </div>
                  ) : isPending ? (
                    <div className="text-center text-indigo-500">
                      <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                      <p className="text-sm font-medium animate-pulse">Generating image...</p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function MagicEditTab({ model, folders, selectedFolder, setSelectedFolder, onEnlarge }: { model: string, folders: string[], selectedFolder: string, setSelectedFolder: (f: string) => void, onEnlarge: (url: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseMimeType, setBaseMimeType] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setBaseMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBaseImage(reader.result as string);
      setResultUrl(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (baseImage && imgRef.current && canvasRef.current) {
      const img = imgRef.current;
      img.onload = () => {
        if (canvasRef.current) {
          canvasRef.current.width = img.naturalWidth;
          canvasRef.current.height = img.naturalHeight;
        }
      };
    }
  }, [baseImage]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; // Draw in white

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const clearMask = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleMagicEdit = async () => {
    if (!prompt.trim() || !baseImage || !canvasRef.current) return;
    
    setIsGenerating(true);
    setResultUrl(null);

    try {
      // Create offscreen canvas for the mask (black background, white strokes)
      const offscreen = document.createElement('canvas');
      offscreen.width = canvasRef.current.width;
      offscreen.height = canvasRef.current.height;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) throw new Error("Could not get canvas context");
      
      // Fill black
      offCtx.fillStyle = 'black';
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      // Draw the white strokes over it
      offCtx.drawImage(canvasRef.current, 0, 0);
      
      const maskBase64 = offscreen.toDataURL('image/jpeg').split(',')[1];
      const origBase64 = baseImage.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { inlineData: { data: origBase64, mimeType: baseMimeType } },
            { inlineData: { data: maskBase64, mimeType: 'image/jpeg' } },
            { text: `${prompt}. This is an inpainting request. The second image is a mask where the white areas indicate the region to be edited.` }
          ]
        },
        config: {
          imageConfig: {
            imageSize: "1K" // Standard for edits
          }
        }
      });

      let newBase64Image = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newBase64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (newBase64Image) {
        setResultUrl(newBase64Image);
        
        // Upload to Cloudinary
        try {
          await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: newBase64Image, folder: selectedFolder })
          });
        } catch (uploadErr) {
          console.error("Failed to upload to Cloudinary:", uploadErr);
        }
      } else {
        alert("No image returned from the model.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Magic Edit failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-[#262730] rounded-2xl shadow-sm border border-[#31333F] p-6 mb-8">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-300 mb-2">Edit Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Add a cute cat sitting on the table"
            className="w-full h-20 p-4 bg-[#0e1117] border border-[#31333F] rounded-xl focus:ring-2 focus:ring-[#FF4B4B] focus:border-[#FF4B4B] outline-none resize-none transition-all"
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Save to Folder</label>
          <select 
            value={selectedFolder} 
            onChange={e => setSelectedFolder(e.target.value)} 
            className="w-full p-2.5 border border-[#31333F] rounded-xl bg-[#0e1117] focus:ring-2 focus:ring-[#FF4B4B] outline-none text-sm"
            disabled={isGenerating}
          >
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {!baseImage ? (
        <div className="border-2 border-dashed border-[#31333F] rounded-2xl p-12 text-center">
          <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-1">Upload an image to edit</h3>
          <p className="text-sm text-gray-500 mb-4">PNG, JPG up to 10MB</p>
          <label className="bg-[#262730] border border-[#31333F] text-gray-300 hover:bg-[#0e1117] px-6 py-2.5 rounded-xl font-medium cursor-pointer transition-colors inline-block">
            Browse Files
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Paint Mask</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-gray-500" />
                  <input 
                    type="range" 
                    min="10" max="100" 
                    value={brushSize} 
                    onChange={e => setBrushSize(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
                <button onClick={clearMask} className="text-xs text-red-600 hover:text-red-700 font-medium">Clear Mask</button>
                <button onClick={() => setBaseImage(null)} className="text-xs text-gray-500 hover:text-gray-300 font-medium">Change Image</button>
              </div>
            </div>
            
            <div className="relative rounded-xl overflow-hidden border border-[#31333F] bg-[#31333F] inline-block w-full" style={{ touchAction: 'none' }}>
              <img 
                ref={imgRef} 
                src={baseImage} 
                alt="Base" 
                className="w-full h-auto block"
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchCancel={stopDrawing}
                onTouchMove={draw}
                className="absolute inset-0 w-full h-full cursor-crosshair opacity-60"
                style={{ touchAction: 'none' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Draw over the area you want to edit. The white mask indicates the editable region.</p>
          </div>

          {/* Result Area */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-300 mb-2">Result</label>
            <div className="flex-1 border border-[#31333F] rounded-xl bg-[#0e1117] flex items-center justify-center relative overflow-hidden min-h-[300px]">
              {isGenerating ? (
                <div className="text-center text-indigo-500">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                  <p className="text-sm font-medium animate-pulse">Applying Magic Edit...</p>
                </div>
              ) : resultUrl ? (
                <div className="relative w-full h-full group flex items-center justify-center p-4">
                  <img src={resultUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" alt="Edited result" />
                  <button 
                    onClick={() => onEnlarge(resultUrl)}
                    className="absolute top-6 right-6 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Enlarge"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Wand2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Your edited image will appear here</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-4">
              {resultUrl ? (
                <a 
                  href={resultUrl} 
                  download="magic-edit-result.png"
                  className="flex items-center gap-2 bg-[#262730] border border-[#31333F] hover:bg-[#0e1117] text-gray-300 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Result
                </a>
              ) : <div />}
              
              <button
                onClick={handleMagicEdit}
                disabled={isGenerating || !prompt.trim()}
                className="bg-[#FF4B4B] hover:bg-[#FF6B6B] disabled:bg-[#FF4B4B]/50 text-white px-8 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                Apply Magic Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FoldersTab({ folders, onEnlarge }: { folders: string[], onEnlarge: (url: string) => void }) {
  const [selectedFolder, setSelectedFolder] = useState<string>('start');
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (folders.length > 0 && !folders.includes(selectedFolder)) {
      setSelectedFolder(folders[0]);
    }
  }, [folders, selectedFolder]);

  useEffect(() => {
    if (!selectedFolder) return;
    setLoading(true);
    fetch(`/api/images/${selectedFolder}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setImages(data);
        }
      })
      .catch(err => console.error("Failed to fetch images", err))
      .finally(() => setLoading(false));
  }, [selectedFolder]);

  return (
    <div className="bg-[#262730] rounded-2xl shadow-sm border border-[#31333F] p-6 mb-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Cloudinary Folders</h2>
        <select 
          value={selectedFolder}
          onChange={e => setSelectedFolder(e.target.value)}
          className="px-4 py-2 border border-[#31333F] rounded-xl bg-[#0e1117] focus:ring-2 focus:ring-[#FF4B4B] outline-none text-sm"
        >
          {folders.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.public_id} className="relative group rounded-xl overflow-hidden border border-[#31333F] bg-[#0e1117] aspect-square">
              <img 
                src={img.url} 
                alt="Cloudinary Image" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                  onClick={() => onEnlarge(img.url)}
                  className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-lg transition-colors"
                  title="Enlarge"
                >
                  <Maximize className="w-5 h-5" />
                </button>
                <a 
                  href={img.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No images found in this folder</p>
        </div>
      )}
    </div>
  );
}

function ApiKeyCheck({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        setHasKey(true);
      }
      setChecking(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (checking) return <div className="flex items-center justify-center h-screen bg-[#0e1117]"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0e1117] p-4 font-sans">
        <div className="max-w-md w-full bg-[#262730] rounded-2xl shadow-sm border border-[#31333F] p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-indigo-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">API Key Required</h1>
          <p className="text-gray-600 mb-6 text-sm">
            To generate high-quality images with Gemini 3.1 Flash, you need to select a Google Cloud project with billing enabled.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-[#FF4B4B] hover:bg-[#FF6B6B] text-white font-medium py-3 px-4 rounded-xl transition-colors cursor-pointer"
          >
            Select API Key
          </button>
          <p className="mt-4 text-xs text-gray-500">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[#FF4B4B] hover:underline">
              Learn more about billing
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
