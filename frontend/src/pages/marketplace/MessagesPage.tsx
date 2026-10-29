import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageSquare, Send, ShieldCheck, AlertTriangle, CheckCircle, Package, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface ConversationItem {
  id: string;
  other_user: {
    id: string;
    name: string;
    is_verified?: boolean;
  };
  listing?: {
    id: string;
    title: string;
    price_ngn: number;
    unit: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    is_read: boolean;
  };
  unread_count: number;
  updated_at: string;
}

interface MessageItem {
  id: string;
  sender_id: string;
  is_me: boolean;
  content: string;
  is_flagged: boolean;
  flag_reason?: string;
  is_read: boolean;
  created_at: string;
}

export const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const targetSellerId = searchParams.get('sellerId');
  const targetListingId = searchParams.get('listingId');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversations list
  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      const list = res.data || [];
      setConversations(list);

      // If active conversation not set, select first or target
      if (!activeConvId && list.length > 0) {
        setActiveConvId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // If redirected with ?sellerId, open or initiate conversation
  useEffect(() => {
    const initTarget = async () => {
      if (targetSellerId && user) {
        try {
          const res = await api.post('/messages/conversations', {
            seller_id: targetSellerId,
            listing_id: targetListingId || undefined,
            initial_message: targetListingId ? 'Hello! I am interested in this item on Reva Hub.' : undefined,
          });
          if (res.data?.conversation_id) {
            setActiveConvId(res.data.conversation_id);
            fetchConversations();
          }
        } catch (err: any) {
          console.warn('Could not auto-start conversation:', err);
        }
      }
    };
    initTarget();
  }, [targetSellerId, targetListingId, user]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch active conversation messages
  const fetchActiveChat = async (convId: string) => {
    try {
      const res = await api.get(`/messages/conversations/${convId}`);
      setActiveConv(res.data);
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      fetchActiveChat(activeConvId);
      const interval = setInterval(() => {
        fetchActiveChat(activeConvId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Send message with anti-disintermediation handling
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvId || sending) return;

    setSending(true);
    setSecurityAlert(null);
    const contentToSend = newMessage.trim();
    setNewMessage('');

    try {
      const res = await api.post(`/messages/conversations/${activeConvId}/send`, {
        content: contentToSend,
      });

      const sentMsg = res.data;
      setMessages((prev) => [...prev, sentMsg]);

      if (sentMsg.warning_notice) {
        setSecurityAlert(sentMsg.warning_notice);
        toast('⚠️ Reva Escrow Notice: Contact information or direct payment details were filtered for security.', {
          icon: '🛡️',
          duration: 6000,
        });
      }

      fetchConversations();
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to send message';
      toast.error(detail);
      setNewMessage(contentToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-[#062E12]" /> In-App Buyer & Seller Messaging
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Real-time supervised communication protected by <strong>Reva Escrow Guarantee</strong>.
          </p>
        </div>
        <Link
          to="/listings"
          className="text-xs text-[#062E12] font-semibold hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Marketplace
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left column: Conversations sidebar */}
        <div className="md:col-span-4 border-r border-gray-200 flex flex-col bg-gray-50/50">
          <div className="p-3.5 border-b border-gray-200 bg-white">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Recent Conversations ({conversations.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading && (
              <div className="p-8 text-center text-xs text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#062E12]" />
                Loading conversations...
              </div>
            )}

            {!loading && conversations.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-xs">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No active conversations yet. Click <strong>"Chat with Seller"</strong> on any listing to start.
              </div>
            )}

            {conversations.map((c) => {
              const isSelected = c.id === activeConvId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveConvId(c.id);
                    setSecurityAlert(null);
                  }}
                  className={`w-full text-left p-3.5 transition flex items-start gap-3 hover:bg-gray-100/80 ${
                    isSelected ? 'bg-emerald-50/80 border-l-4 border-[#062E12]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#062E12] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {c.other_user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 truncate flex items-center gap-1">
                        {c.other_user.name}
                        {c.other_user.is_verified && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        )}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#062E12] text-white text-[10px] font-bold rounded-full">
                          {c.unread_count}
                        </span>
                      )}
                    </div>

                    {c.listing && (
                      <p className="text-[11px] text-[#062E12] font-semibold truncate mt-0.5 flex items-center gap-1">
                        <Package className="w-3 h-3" /> {c.listing.title}
                      </p>
                    )}

                    <p className="text-xs text-gray-500 truncate mt-1">
                      {c.last_message?.content || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Active Chat Thread */}
        <div className="md:col-span-8 flex flex-col bg-white">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#062E12] text-white flex items-center justify-center font-bold text-sm">
                    {activeConv.other_user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                      {activeConv.other_user.name}
                      {activeConv.other_user.is_verified_seller && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                          <CheckCircle className="w-3 h-3" /> Verified Seller
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500">Official In-App Direct Channel</p>
                  </div>
                </div>

                {activeConv.listing && (
                  <Link
                    to={`/listings/${activeConv.listing.id}`}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-800 transition"
                  >
                    <Package className="w-3.5 h-3.5 text-[#062E12]" />
                    <span>View Listing (₦{activeConv.listing.price_ngn.toLocaleString()})</span>
                  </Link>
                )}
              </div>

              {/* Escrow Supervision Banner */}
              <div className="bg-emerald-950 text-emerald-100 px-4 py-2.5 text-xs flex items-center gap-2 border-b border-emerald-900">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span>
                  <strong>🔒 Supervised Reva Escrow Chat:</strong> External contact sharing & off-platform payments are strictly monitored to protect your payment guarantee.
                </span>
              </div>

              {/* Security Alert Toast if a recent message had phone/bank redacted */}
              {securityAlert && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{securityAlert}</span>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF8F5]/60 min-h-[380px]">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-xs text-gray-400">
                    No messages yet. Say hello and ask your questions!
                  </div>
                )}

                {messages.map((m) => {
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.is_me ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          m.is_me
                            ? 'bg-[#062E12] text-white rounded-br-xs'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>

                        {m.is_flagged && (
                          <div className={`mt-1.5 pt-1.5 border-t text-[10px] font-medium flex items-center gap-1 ${
                            m.is_me ? 'border-white/20 text-amber-200' : 'border-gray-100 text-amber-700'
                          }`}>
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span>Contact info was redacted by Reva Escrow Filter</span>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message (negotiate price, delivery, quantities)..."
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#062E12] focus:border-transparent transition"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-5 py-2.5 bg-[#062E12] hover:bg-[#083d18] text-white rounded-lg font-bold text-sm transition flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <span>Send</span>
                    <Send className="w-4 h-4 text-[#D4AF37]" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  ⚠️ Off-platform payments void Reva Escrow. Keep conversations here to stay protected.
                </p>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">Select a conversation to start chatting</p>
              <p className="text-xs text-gray-500 mt-1">
                All interactions are monitored to guarantee buyer & seller escrow protection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
