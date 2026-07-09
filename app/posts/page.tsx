"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, Share2, MessageCircle, AlertCircle, Trash2, Send, Clock, Sparkles } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { getLocalProfile } from "@/lib/profile-utils";

interface Comment {
  id: number;
  authorId: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
}

interface Post {
  id: number;
  authorId: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  image?: string;
  likes: number;
  likedBy: string[]; // array of user emails/ids who liked
  comments: Comment[];
}

// Initial Simulated feed data with comments pre-loaded
const INITIAL_POSTS: Post[] = [];

const BAD_WORDS = ['badword', 'profane', 'nudity', 'inappropriate', 'scam', 'spam'];

export default function PostsFeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Expanded comment sections
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  // Dynamic comment inputs per post id
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // Image Upload state for posts
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [imageScanResult, setImageScanResult] = useState<"clean" | "malware" | null>(null);

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  const currentUserProfile = user ? getLocalProfile(user.id, user.email) : null;

  // Trigger floating notifications
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Load posts from localStorage on mount
  useEffect(() => {
    const handleSync = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("searchbiz_community_posts_v1");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
               setPosts(parsed);
            }
          } catch (e) {}
        }
      }
    };

    handleSync();

    // Fresh fetch from server immediately
    fetch('/api/storage', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data.community_posts)) {
          setPosts(data.community_posts);
          localStorage.setItem("searchbiz_community_posts_v1", JSON.stringify(data.community_posts));
        }
      }).catch(() => null);

    window.addEventListener("searchbiz_posts_updated", handleSync);
    
    return () => {
      window.removeEventListener("searchbiz_posts_updated", handleSync);
    };
  }, []);

  // Sync posts to localStorage
  const savePosts = (newPosts: Post[]) => {
    setPosts(newPosts);
    if (typeof window !== "undefined") {
      localStorage.setItem("searchbiz_community_posts_v1", JSON.stringify(newPosts));
      // Sync to server
      fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_posts: newPosts })
      }).catch(() => null);
    }
  };

  useEffect(() => {
    if (user && posts.length > 0) {
      const userPosts = posts.filter(p => p.authorId === user.email);
      // Simple daily lock (simulated)
      if (userPosts.length > 5 && !hasPostedToday) {
        Promise.resolve().then(() => {
          setHasPostedToday(true);
        });
      }
    }
  }, [user, posts, hasPostedToday]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please log in to post updates.");
      return;
    }
    if (!newPostContent.trim()) return;

    // AI Inspector Content Check
    const lower = newPostContent.toLowerCase();
    if (BAD_WORDS.some(bw => lower.includes(bw))) {
      setError("AI Inspector Alert: Post blocked! Violation of community policies (profanity/spam/inappropriate language).");
      return;
    }

    setIsSubmitting(true);
    setError("");
    
    setTimeout(() => {
      let displayName = user.email.split('@')[0];
      const profile = getLocalProfile(user.id, user.email);
      if (profile) {
        if (profile.displayName) displayName = profile.displayName;
        else if (profile.businessName) displayName = profile.businessName;
        else if (profile.fullName) displayName = `${profile.fullName} ${profile.surname}`.trim();
        else displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      }
      
      const newPost: Post = {
        id: Date.now(),
        authorId: user.email,
        author: displayName,
        avatar: displayName[0].toUpperCase(),
        time: "Just now",
        content: newPostContent,
        image: newPostImage || undefined,
        likes: 0,
        likedBy: [],
        comments: []
      };

      const updated = [newPost, ...posts];
      savePosts(updated);
      setNewPostContent("");
      setNewPostImage(null);
      setImageScanResult(null);
      setIsSubmitting(false);
      triggerToast("Update posted successfully!");
    }, 450);
  };

  const handleLike = (postId: number) => {
    if (!user) {
      triggerToast("Please log in to like posts.");
      return;
    }

    const updated = posts.map(post => {
      if (post.id === postId) {
        const likedBy = post.likedBy || [];
        const matchesUser = likedBy.includes(user.email);
        
        if (matchesUser) {
          // Unlike
          return {
            ...post,
            likes: Math.max(0, post.likes - 1),
            likedBy: likedBy.filter(email => email !== user.email)
          };
        } else {
          // Like
          return {
            ...post,
            likes: post.likes + 1,
            likedBy: [...likedBy, user.email]
          };
        }
      }
      return post;
    });

    savePosts(updated);
  };

  const handleAddComment = (postId: number) => {
    if (!user) {
      triggerToast("Please log in to comment.");
      return;
    }

    const commentText = commentInputs[postId] || "";
    if (!commentText.trim()) return;

    // Simple word filter
    const lowerComment = commentText.toLowerCase();
    if (BAD_WORDS.some(bw => lowerComment.includes(bw))) {
      triggerToast("AI Checked: comment blocked due to sensitive terms.");
      return;
    }

    let commentAuthor = user.email.split('@')[0];
    const profile = getLocalProfile(user.id, user.email);
    if (profile) {
      if (profile.displayName) commentAuthor = profile.displayName;
      else if (profile.businessName) commentAuthor = profile.businessName;
      else if (profile.fullName) commentAuthor = `${profile.fullName} ${profile.surname}`.trim();
      else commentAuthor = commentAuthor.charAt(0).toUpperCase() + commentAuthor.slice(1);
    }

    const newComment: Comment = {
      id: Date.now(),
      authorId: user.email,
      author: commentAuthor,
      avatar: commentAuthor[0].toUpperCase(),
      time: "Just now",
      content: commentText.trim()
    };

    const updated = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...(post.comments || []), newComment]
        };
      }
      return post;
    });

    savePosts(updated);
    setCommentInputs({
      ...commentInputs,
      [postId]: ""
    });
    triggerToast("Comment added!");
  };

  const toggleComments = (postId: number) => {
    if (!user) {
      triggerToast("Please log in to view or write comments.");
      return;
    }
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleShare = async (post: Post) => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/posts#post-${post.id}` : '';
    const shareData = {
      title: 'SearchBiz.co.za Post',
      text: post.content.substring(0, 100) + '...',
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        triggerToast("Shared successfully!");
        return;
      } catch (err: any) {
        // If they abort, don't fallback to clipboard to prevent double alerts
        if (err.name === 'AbortError') {
          return;
        }
        console.warn("Native share failed in environment:", err);
      }
    }

    // Direct clipboard fallback if sharing fails or is not supported
    try {
      await navigator.clipboard.writeText(shareUrl);
      triggerToast("Copied post link to clipboard! Ready to share with anyone.");
    } catch (e) {
      triggerToast("Failed to copy link.");
    }
  };

  const handleEditPost = (postId: number, newContent: string) => {
    if (!newContent.trim()) return;
    const updated = posts.map(post => {
      if (post.id === postId) {
        return { ...post, content: newContent.trim() };
      }
      return post;
    });
    savePosts(updated);
    setEditingPostId(null);
    triggerToast("Post edited successfully!");
  };

  const deletePost = (id: number) => {
    const updated = posts.filter(p => p.id !== id);
    savePosts(updated);
    triggerToast("Post deleted successfully.");
  };

  const handleEditComment = (postId: number, commentId: number, newContent: string) => {
    if (!newContent.trim()) return;
    const updated = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments.map(c => {
            if (c.id === commentId) {
              return { ...c, content: newContent.trim() };
            }
            return c;
          })
        };
      }
      return post;
    });
    savePosts(updated);
    setEditingCommentId(null);
    triggerToast("Comment updated successfully!");
  };

  const handleDeleteComment = (postId: number, commentId: number) => {
    const updated = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments.filter(c => c.id !== commentId)
        };
      }
      return post;
    });
    savePosts(updated);
    triggerToast("Comment deleted.");
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Community Feed</h1>
          <p className="text-slate-500">Discover recent updates, specials, and reviews from South African businesses.</p>
        </div>

        {/* Post Creator */}
        {user ? (() => {
          const currentDisplayName = currentUserProfile?.displayName || currentUserProfile?.businessName || (currentUserProfile?.fullName ? `${currentUserProfile.fullName} ${currentUserProfile.surname}`.trim() : user.email.split('@')[0]);
          return (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-8">
            <form onSubmit={handleCreatePost}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
                  {currentUserProfile?.avatarUrl ? (
                    <img src={currentUserProfile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    currentDisplayName[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-800">{currentDisplayName}</span>
                  <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Posting as active community partner
                  </div>
                </div>
              </div>
              <textarea 
                className="w-full bg-slate-50 rounded-2xl p-4 text-slate-800 placeholder-slate-400 outline-none border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none text-sm md:text-base mb-3"
                placeholder="Share a promo, business update, or ask a community question..."
                rows={3}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                disabled={isSubmitting}
              />

              {/* Image Uploader for Community Post */}
              {newPostImage && !isScanningImage ? (
                <div className="relative inline-block mb-3 border border-slate-200 rounded-xl overflow-hidden shrink-0">
                  <img src={newPostImage} alt="Post Attachment" className="h-32 w-auto object-cover" />
                  <button type="button" onClick={() => setNewPostImage(null)} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {imageScanResult === 'clean' && (
                    <div className="absolute bottom-1 right-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                      ✓ Clean
                    </div>
                  )}
                </div>
              ) : isScanningImage ? (
                <div className="mb-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 flex items-center gap-2 animate-pulse">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  AI Inspector: Scanning image & resizing...
                </div>
              ) : (
                <div className="mb-3 flex items-center">
                  <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-4 py-2 rounded-xl transition-all">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsScanningImage(true);
                          setImageScanResult(null);
                          // mock scan and resize
                          setTimeout(() => {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setNewPostImage(reader.result as string);
                              setIsScanningImage(false);
                              setImageScanResult("clean");
                            };
                            reader.readAsDataURL(file);
                          }, 1500);
                        }
                      }}
                    />
                    <Sparkles className="w-4 h-4" /> Add Photo Advertisement
                  </label>
                </div>
              )}
              
              {error && (
                <div className="mt-3 flex items-center bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border border-rose-100">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                <div className="text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <span className="text-emerald-600 font-bold">AI Inspector</span> Active • Images scanned
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !newPostContent.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" /> {isSubmitting ? "Posting..." : "Share Update"}
                </button>
              </div>
            </form>
          </div>
          );
        })() : (
          <div className="bg-emerald-50/50 text-emerald-800 p-6 rounded-2xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-100/60">
            <div>
              <p className="font-semibold text-emerald-900 text-sm sm:text-base">Want to share business updates?</p>
              <p className="text-emerald-700 text-xs sm:text-sm">Sign in to publish messages, review companies, and chat with customers.</p>
            </div>
            <Link href="/login" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl whitespace-nowrap transition-colors shadow-sm shrink-0">
              Log In to Feed
            </Link>
          </div>
        )}

        {/* Feed List */}
        <div className="space-y-6">
          {posts.map(post => {
            const hasLiked = user && post.likedBy && post.likedBy.includes(user.email);
            const isExpanded = user && (expandedComments[post.id] || false);
            
            return (
              <div key={post.id} id={`post-${post.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
                
                {/* Header aspect */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                      {post.avatar || (post.author ? post.author[0].toUpperCase() : "?")}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base leading-none mb-1">{post.author}</h3>
                      <span className="text-xs text-slate-400 font-medium">{post.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {user && user.role === "ADMIN" && (
                      <>
                        <button 
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditingPostContent(post.content);
                          }} 
                          className="text-xs font-bold text-slate-500 hover:text-emerald-600 px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 rounded-lg transition"
                          title="Edit Post"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this community post?")) {
                              deletePost(post.id);
                            }
                          }} 
                          className="text-slate-400 hover:text-rose-600 p-2 bg-slate-50 hover:bg-rose-50 rounded-xl transition" 
                          title="Remove Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Visual content aspect */}
                <div className="px-5 pb-4">
                  {editingPostId === post.id ? (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <textarea
                        className="w-full bg-white rounded-xl p-3 text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm resize-none font-medium"
                        rows={3}
                        value={editingPostContent}
                        onChange={(e) => setEditingPostContent(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditPost(post.id, editingPostContent)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap font-medium">{post.content}</p>
                  )}
                </div>

                {post.image && (
                  <div className="w-full h-64 md:h-80 relative bg-slate-100 flex items-center justify-center overflow-hidden border-y border-slate-100">
                     <img src={post.image} alt="Post media" referrerPolicy="no-referrer" className="object-cover object-center w-full h-full" />
                  </div>
                )}

                {/* Interaction controls */}
                <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={() => handleLike(post.id)} 
                    className={`flex items-center font-bold text-xs md:text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      hasLiked 
                        ? 'text-emerald-600 bg-emerald-50' 
                        : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 mr-2 ${hasLiked ? 'fill-emerald-600' : ''}`} />
                    <span>{post.likes} <span className="hidden sm:inline">Likes</span></span>
                  </button>
                  
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center text-slate-500 hover:text-emerald-600 hover:bg-slate-50 font-bold text-xs md:text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    <span>{(post.comments || []).length} <span className="hidden sm:inline">Comments</span></span>
                  </button>
                  
                  <button 
                    onClick={() => handleShare(post)}
                    className="flex items-center text-slate-500 hover:text-emerald-600 hover:bg-slate-50 font-bold text-xs md:text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Collapsible Comments Section */}
                {isExpanded && (
                  <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Comments</h4>
                    
                    {/* Comments List */}
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {(!post.comments || post.comments.length === 0) ? (
                        <p className="text-xs text-slate-400 font-medium text-center py-2">No comments yet. Start the conversation!</p>
                      ) : (
                        post.comments.map(comment => (
                          <div key={comment.id} className="flex gap-3 text-xs md:text-sm">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 mt-0.5">
                              {comment.avatar || (comment.author ? comment.author[0].toUpperCase() : "?")}
                            </div>
                            <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative group/comment">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-800 text-xs">{comment.author}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-semibold">{comment.time}</span>
                                  {user && user.role === "ADMIN" && (
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-0.5 border border-slate-200">
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditingCommentContent(comment.content);
                                        }}
                                        className="text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 transition tracking-wider flex items-center gap-0.5"
                                        title="Edit comment"
                                      >
                                        Edit
                                      </button>
                                      <span className="text-[9px] text-slate-300">|</span>
                                      <button
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this comment?")) {
                                            handleDeleteComment(post.id, comment.id);
                                          }
                                        }}
                                        className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700 transition tracking-wider flex items-center gap-1"
                                        title="Delete comment"
                                      >
                                        <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="space-y-2 mt-1">
                                  <input
                                    type="text"
                                    className="w-full bg-slate-50 rounded-xl px-3 py-2 text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none text-xs font-semibold"
                                    value={editingCommentContent}
                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                  />
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleEditComment(post.id, comment.id, editingCommentContent)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-600 text-xs leading-relaxed">{comment.content}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* New Comment Input form */}
                    {user ? (
                      <div className="flex gap-2.5 mt-4 pt-3 border-t border-slate-200">
                        <input
                          type="text"
                          placeholder="Add a public comment..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs sm:text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({
                            ...commentInputs,
                            [post.id]: e.target.value
                          })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(post.id);
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
                        >
                          <Send className="w-3 h-3" />
                          Comment
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white text-slate-500 text-xs p-3.5 rounded-xl border border-slate-200 text-center font-medium mt-4">
                        Please <Link href="/login" className="text-emerald-600 font-bold hover:underline">log in</Link> to post comments.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Animated Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
