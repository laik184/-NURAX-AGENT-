import { useState, useEffect } from "react";
import { X, FileText, FolderPlus, Upload, Download, Trash2, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileOpen?: (path: string) => void;
}

type ButtonKey = "newFile" | "newFolder" | "upload" | "download";

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  children: FileItem[];
}

export function FilesModal({ isOpen, onClose, onFileOpen }: FilesModalProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [buttonOrder, setButtonOrder] = useState<ButtonKey[]>([
    "newFile",
    "newFolder",
    "upload",
    "download",
  ]);
  const [draggedButton, setDraggedButton] = useState<ButtonKey | null>(null);
  const { toast } = useToast();

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/files/list");
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewFile = async () => {
    const fileName = prompt("Enter file name:");
    if (!fileName) return;
    
    try {
      const response = await fetch("/api/files/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, isFolder: false }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `File ${fileName} created successfully`,
        });
        fetchFiles();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive",
      });
    }
  };

  const handleNewFolder = async () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;
    
    try {
      const response = await fetch("/api/files/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: folderName, isFolder: true }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Folder ${folderName} created successfully`,
        });
        fetchFiles();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleUploadFiles = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async (e: any) => {
      const uploadedFiles = Array.from(e.target.files) as File[];
      
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        
        try {
          const response = await fetch("/api/files/upload", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error("Upload failed");
          }
        } catch (error) {
          toast({
            title: "Error",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Success",
        description: `${uploadedFiles.length} file(s) uploaded successfully`,
      });
      fetchFiles();
    };
    input.click();
  };

  const handleDownloadZip = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/files/download");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project-files.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Project downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (filePath: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!confirm(`Delete ${filePath}?`)) return;
    
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(filePath)}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "File/folder deleted successfully",
        });
        fetchFiles();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete file/folder",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file/folder",
        variant: "destructive",
      });
    }
  };

  const renderFileTree = (items: FileItem[], prefix = ""): JSX.Element[] => {
    return items.flatMap(item => {
      const isExpanded = expandedFolders.has(item.path);
      return [
        <div
          key={item.path}
          className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer group"
          style={{ marginLeft: `${prefix.length * 8}px` }}
          data-testid={`file-item-${item.path}`}
          onClick={() => {
            if (item.isDirectory) {
              toggleFolder(item.path);
            } else {
              onFileOpen?.(item.path);
            }
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {item.isDirectory ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(item.path);
                  }}
                  className="p-0 hover:bg-gray-700/50 rounded"
                  data-testid={`button-toggle-${item.path}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <FolderPlus className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
              </>
            ) : (
              <>
                <div className="w-4" />
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
              </>
            )}
            <span className="text-gray-300 text-xs sm:text-sm truncate">{item.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleDeleteFile(item.path, e)}
            className="h-6 w-6 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-delete-${item.path}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>,
        ...(item.isDirectory && isExpanded && item.children ? renderFileTree(item.children, prefix + "  ") : [])
      ];
    });
  };

  const buttonConfig = {
    newFile: {
      label: "New file",
      icon: FileText,
      onClick: handleNewFile,
      testid: "button-new-file",
    },
    newFolder: {
      label: "New folder",
      icon: FolderPlus,
      onClick: handleNewFolder,
      testid: "button-new-folder",
    },
    upload: {
      label: "Upload files",
      icon: Upload,
      onClick: handleUploadFiles,
      testid: "button-upload-files",
    },
    download: {
      label: "Download",
      icon: Download,
      onClick: handleDownloadZip,
      testid: "button-download-zip",
    },
  };

  const handleDragStart = (button: ButtonKey) => {
    setDraggedButton(button);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetButton: ButtonKey) => {
    if (!draggedButton || draggedButton === targetButton) return;

    const draggedIndex = buttonOrder.indexOf(draggedButton);
    const targetIndex = buttonOrder.indexOf(targetButton);

    const newOrder = [...buttonOrder];
    [newOrder[draggedIndex], newOrder[targetIndex]] = [
      newOrder[targetIndex],
      newOrder[draggedIndex],
    ];

    setButtonOrder(newOrder);
    setDraggedButton(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0f1419] rounded-2xl w-full max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-700">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">Files</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-transparent h-8 w-8 sm:h-10 sm:w-10"
            data-testid="button-files-close"
          >
            <X className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>
        </div>

        {/* File List Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-12">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-gray-500 text-xs sm:text-sm">
              No files yet. Create a new file or folder to get started.
            </div>
          ) : (
            <div className="space-y-1 sm:space-y-2">
              {renderFileTree(files)}
            </div>
          )}
        </div>

        {/* Bottom Buttons - Single Row */}
        <div className="border-t border-gray-700 bg-[#0f1419] px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex gap-1.5 sm:gap-2">
            {buttonOrder.map((buttonKey) => {
              const config = buttonConfig[buttonKey];
              const Icon = config.icon;
              return (
                <Button
                  key={buttonKey}
                  draggable
                  onDragStart={() => handleDragStart(buttonKey)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(buttonKey)}
                  className="flex items-center justify-center gap-1 bg-gray-800/60 hover:bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium cursor-grab active:cursor-grabbing opacity-100 hover:opacity-90 transition-opacity flex-1"
                  onClick={config.onClick}
                  data-testid={config.testid}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="sm:hidden text-xs">
                    {config.label.split(" ")[0]}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
