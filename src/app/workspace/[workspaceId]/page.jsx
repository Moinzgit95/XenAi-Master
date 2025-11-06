"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/config/firebase";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import Chat from "@/components/Chat";
import Editor from "@/components/Editor";
import SearchBar from "@/components/Searchbar";
import {
    MessageCircle,
    PanelLeftOpen,
    FileSearch,
    HelpCircle,
    LayoutDashboard,
    Sparkles,
    Upload,
    Play,
    Code,
    Search,
    Settings,
    Terminal,
    Shrink,
    Expand,
    X
} from "lucide-react";
import ShowMembers from "@/components/Members";
import LiveCursor from "@/components/LiveCursor";
import NavPanel from "@/components/Navpanel";
import { LANGUAGE_VERSIONS } from "@/constants";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin border-t-4 border-blue-500 border-solid rounded-full w-16 h-16 border-b-transparent"></div>
  </div>
);

const Workspace = () => {
    const { workspaceId } = useParams();
    const router = useRouter();
    const [selectedFile, setSelectedFile] = useState(null);
    const [workspaceName, setWorkspaceName] = useState("");
    const [membersCount, setMembersCount] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(true);
    const [currentLanguage, setCurrentLanguage] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state
    const [userName, setUserName] = useState("");
    const [activePanel, setActivePanel] = useState("files"); // Default to files panel
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const fetchWorkspace = async () => {
            if (!workspaceId) return;

            setLoading(true); // Set loading to true when starting to fetch
            const workspaceRef = doc(db, "workspaces", workspaceId);
            const workspaceSnap = await getDoc(workspaceRef);

            if (workspaceSnap.exists()) {
                const workspaceData = workspaceSnap.data();
                setWorkspaceName(workspaceData.name);

                const membersRef = collection(db, `workspaces/${workspaceId}/members`);
                const membersSnap = await getDocs(membersRef);
                setMembersCount(membersSnap.size);
            } else {
                console.error("Workspace not found");
            }
            setLoading(false); // Set loading to false once data is fetched
        };

        fetchWorkspace();
    }, [workspaceId]);

    // Fetch User Info
    useEffect(() => {
        const fetchUserInfo = async () => {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setUserName(userSnap.data().displayName || user.email);
                } else {
                    setUserName(user.displayName);
                }
            }
        };

        fetchUserInfo();
    }, []);

    // Add event listener for NavPanel double-click to minimize
    useEffect(() => {
        const handleToggleNavPanel = (event) => {
            if (event.detail && event.detail.minimize) {
                setIsNavOpen(false);
            }
        };
        
        window.addEventListener('toggleNavPanel', handleToggleNavPanel);
        
        return () => {
            window.removeEventListener('toggleNavPanel', handleToggleNavPanel);
        };
    }, []);

    useEffect(() => {
        console.log("🔄 Parent re-rendered!");
        if (selectedFile && selectedFile.name) {
            const parts = selectedFile.name.split(".");
            if (parts.length > 1) {
                const extension = parts.pop().toLowerCase();
                // Map file extension to language (adjust this based on your LANGUAGE_VERSIONS)
                let language;
                for (const lang in LANGUAGE_VERSIONS) {
                    if (LANGUAGE_VERSIONS[lang] === extension) {
                        language = lang;
                        break;
                    }
                }
                setCurrentLanguage(language);
            } else {
                setCurrentLanguage(null); // No extension
            }
        } else {
            setCurrentLanguage(null); // No selected file
        }
    }, [selectedFile]);

    const handleLanguageSelect = (lang) => {
        setCurrentLanguage(lang);
        // You might want to trigger an action here based on the selected language
        console.log(`Language selected: ${lang}`);
    };

    const goToDashboard = () => {
        router.push("/dashboard");
    };

    // Function to handle panel switching
    const handlePanelChange = (panel) => {
        setActivePanel(panel);
        if (panel === "chat") {
            setIsChatOpen(true);
        } else if (isChatOpen && panel !== "chat") {
            setIsChatOpen(false);
        }
    };

    // State for search functionality
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Handle search functionality
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredFiles([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const query = searchQuery.toLowerCase();
        
        // Filter files based on search query
        const fetchFiles = async () => {
            const filesRef = collection(db, `workspaces/${workspaceId}/files`);
            const filesSnap = await getDocs(filesRef);
            const allFiles = filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const matchedFiles = allFiles.filter(file => 
                file.name.toLowerCase().includes(query)
            );
            
            setFilteredFiles(matchedFiles);
        };
        
        fetchFiles();
    }, [searchQuery, workspaceId]);

    // Function to get file icon based on extension
    const getFileIcon = (fileName) => {
        const parts = fileName.split('.');
        const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
        
        switch(ext) {
            case 'js': case 'jsx': case 'ts': case 'tsx':
                return <Code size={16} className="mr-2 text-yellow-400" />;
            case 'html': case 'css':
                return <FileText size={16} className="mr-2 text-blue-400" />;
            default:
                return <File size={16} className="mr-2 text-gray-400" />;
        }
    };

    // Render the active panel content
    const renderPanelContent = () => {
        if (!isNavOpen) return null;
        
        switch (activePanel) {
            case "files":
                return <NavPanel workspaceId={workspaceId} openFile={setSelectedFile} />;
            case "search":
                return (
                    <div className="p-4 h-full flex flex-col">
                        <h2 className="text-xl font-semibold mb-4 text-indigo-400">Search Files</h2>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            {searchQuery && (
                                <button
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                                    onClick={() => setSearchQuery("")}
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        
                        {/* Display search results */}
                        <div className="flex-1 overflow-auto">
                            {isSearching ? (
                                <div className="mt-1">
                                    {filteredFiles.length === 0 ? (
                                        <div className="text-center py-3 text-gray-400 text-sm">
                                            No files match your search
                                        </div>
                                    ) : (
                                        <>
                                            {/* Search results heading */}
                                            <div className="px-2 py-1 text-xs text-gray-400 font-semibold">
                                                Search results for "{searchQuery}"
                                            </div>
                                            
                                            {/* Files in search results */}
                                            <div>
                                                <div className="px-2 py-1 text-xs text-gray-500">Files</div>
                                                {filteredFiles.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="flex items-center justify-between group hover:bg-gray-800 px-2 py-1 rounded transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedFile(file);
                                                            setActivePanel("files");
                                                        }}
                                                    >
                                                        <div className="flex items-center flex-1">
                                                            {getFileIcon(file.name)}
                                                            <span className="text-sm">
                                                                {file.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <FileSearch size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Type to search for files</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case "help":
                return (
                    <div className="p-4 h-full overflow-auto">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">Help & Documentation</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-medium text-blue-300 mb-2">Getting Started</h3>
                                <p className="text-gray-300 mb-2">Welcome to Xen.ai, your AI-powered collaborative code editor!</p>
                                <ul className="list-disc pl-5 text-gray-300 space-y-1">
                                    <li>Create and manage files in the File Explorer</li>
                                    <li>Use the Search feature to find files quickly</li>
                                    <li>Get AI assistance with the AI Chat button</li>
                                </ul>
                            </div>
                            
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-medium text-indigo-300 mb-2">Keyboard Shortcuts</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-gray-400">Ctrl/Cmd + S</div>
                                    <div className="text-gray-300">Save file</div>
                                    <div className="text-gray-400">Ctrl/Cmd + F</div>
                                    <div className="text-gray-300">Search in file</div>
                                    <div className="text-gray-400">Ctrl/Cmd + /</div>
                                    <div className="text-gray-300">Toggle comment</div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-medium text-purple-300 mb-2">AI Features</h3>
                                <p className="text-gray-300 mb-2">Xen.ai comes with powerful AI capabilities:</p>
                                <ul className="list-disc pl-5 text-gray-300 space-y-1">
                                    <li>Code completion and suggestions</li>
                                    <li>Bug detection and fixing</li>
                                    <li>Natural language to code conversion</li>
                                    <li>Code explanation and documentation</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <NavPanel workspaceId={workspaceId} openFile={setSelectedFile} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-950 text-white min-w-[1024px] relative">
            {/* Navigation Bar - Now spans the full width including over the left panel */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 z-30">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity">Xen.ai</span>
                    </Link>
                </div>
                
                <h1 className="text-lg font-mono absolute left-1/2 transform -translate-x-1/2">
                    Workspace: <span className="text-indigo-400">{workspaceName}</span>
                </h1>
                
                <div className="flex items-center gap-6">
                    {/* Dashboard Button */}
                    <button
                        onClick={goToDashboard}
                        className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:shadow-blue-500/50"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                    
                    {/* Search */}
                    <div className="flex items-start bg-blue-800 bg-opacity-40 ring-1 ring-blue-500 px-3 py-1 rounded-md">
                        <SearchBar workspaceId={workspaceId} />
                    </div>
                    
                    {/* Members */}
                    <span className="text-lg text-gray-200 bg-slate-800 px-3 py-1 rounded-full flex items-center justify-center gap-2">
                        <ShowMembers workspaceId={workspaceId} />
                    </span>
                    
                    {/* Profile Avatar */}
                    <Link href="/profile">
                        <Avatar className="w-8 h-8 cursor-pointer border-2 border-gray-500 transition-all duration-300 hover:border-blue-400">
                            <AvatarImage src={auth.currentUser?.photoURL || "/robotic.png"} alt="Profile" />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                    </Link>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Side Panel with Buttons - Improved design */}
                <div className="absolute top-0 left-0 z-20 h-full bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 px-2 space-y-8 shadow-lg">
                    {/* File Panel Toggle */}
                    <button
                        className={`p-2 rounded-lg transition-all duration-300 ${activePanel === 'files' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-gray-800'} text-white`}
                        onClick={() => {
                            setIsNavOpen(true);
                            handlePanelChange("files");
                        }}
                        onDoubleClick={() => setIsNavOpen(false)}
                        title="File Explorer"
                    >
                        <PanelLeftOpen size={22} />
                    </button>
                    
                    {/* AI Chat Button */}
                    <button
                        className={`p-2 rounded-lg transition-all duration-300 ${activePanel === 'chat' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-gray-800'} text-white`}
                        onClick={() => handlePanelChange("chat")}
                        title="AI Chat"
                    >
                        <MessageCircle size={22} />
                    </button>
                    

                    
                    {/* Help/Documentation Button */}
                    <button
                        className={`p-2 rounded-lg transition-all duration-300 ${activePanel === 'help' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg' : 'hover:bg-gray-800'} text-white`}
                        onClick={() => {
                            setIsNavOpen(true);
                            handlePanelChange("help");
                        }}
                        title="Help & Documentation"
                    >
                        <HelpCircle size={22} />
                    </button>
                </div>

                {/* Left Side - Panel Content - Reduced size */}
                <div
                    className={`transition-all duration-300 ml-16 ${isNavOpen ? "w-[20%]" : "w-0"} overflow-hidden bg-gray-900 border-r border-gray-800 flex flex-col h-full`}
                >
                    {renderPanelContent()}
                </div>

                {/* Main - Editor Content */}
                <main className="flex-1 h-screen flex flex-col overflow-auto">
                    {/* Editor Content - Full screen height */}
                    <div className="flex-1 overflow-auto h-full">
                        {/* Show loading spinner if workspace is loading */}
                        {loading ? (
                            <LoadingSpinner />
                        ) : (
                            <Editor file={selectedFile} />
                        )}
                    </div>
                </main>
            </div>

            {/* Chat Panel (Overlapping from Bottom) */}
            <aside
                className={`fixed bottom-0 right-0 transition-all duration-300 shadow-lg ${isChatOpen ? "h-[82%]" : "h-0"} overflow-hidden w-[45%]`}
            >
                {isChatOpen && (
                    <Chat workspaceId={workspaceId} isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} />
                )}
            </aside>

            {/* Chat Toggle Button (only shown when chat is closed) */}
            {!isChatOpen && (
                <button
                    className="fixed bottom-6 right-10 z-30 p-4 flex items-center gap-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    title="Open AI Chat"
                >
                    <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <Sparkles className="h-6 w-6 text-white group-hover:animate-pulse" />
                    <span className="pr-2 font-semibold">Xen.ai</span>
                </button>
            )}
            <LiveCursor workspaceId={workspaceId} />
        </div>
    );
};

export default Workspace;
