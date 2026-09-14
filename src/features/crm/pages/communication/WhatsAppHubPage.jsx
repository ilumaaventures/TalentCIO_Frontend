import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCheck, Clock, Plus, Phone, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { communicationService, contactsService, leadsService } from '../../services/api';

export const WhatsAppHubPage = () => {
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatData, setNewChatData] = useState({ name: '', phone: '' });

  const fetchContactsAndMessages = async () => {
    try {
      const [msgRes, contactRes, leadRes] = await Promise.all([
        communicationService.getWhatsApp(),
        contactsService.getContacts().catch(() => ({ success: false, data: [] })),
        leadsService.getLeads({ limit: 50 }).catch(() => ({ success: false, data: [] })),
      ]);

      if (msgRes.success && msgRes.data.messages) {
        setMessages(msgRes.data.messages);
      }

      const combined = [];
      if (contactRes.success && Array.isArray(contactRes.data)) {
        contactRes.data.forEach((c) => {
          if (c.phone) combined.push({ name: `${c.firstName} ${c.lastName || ''}`.trim(), phone: c.phone });
        });
      }
      if (leadRes.success && Array.isArray(leadRes.data)) {
        leadRes.data.forEach((l) => {
          if (l.phone && !combined.some((c) => c.phone === l.phone)) {
            combined.push({ name: l.fullName || `${l.firstName} ${l.lastName || ''}`.trim(), phone: l.phone });
          }
        });
      }

      setContacts(combined);
      if (combined.length > 0 && !activeRecipient) {
        setActiveRecipient(combined[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContactsAndMessages();
  }, []);

  const handleStartNewChat = (e) => {
    e.preventDefault();
    if (!newChatData.phone.trim()) return;
    const newContact = {
      name: newChatData.name.trim() || newChatData.phone,
      phone: newChatData.phone.trim(),
    };
    setContacts((prev) => [newContact, ...prev.filter((c) => c.phone !== newContact.phone)]);
    setActiveRecipient(newContact);
    setIsNewChatModalOpen(false);
    setNewChatData({ name: '', phone: '' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRecipient) return;

    try {
      await communicationService.sendWhatsApp({
        recipientPhone: activeRecipient.phone,
        recipientName: activeRecipient.name,
        message: inputText,
      });
      setInputText('');
      const res = await communicationService.getWhatsApp();
      if (res?.success && res?.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err);
      alert(err.message || 'Failed to send message');
    }
  };

  const activeMessages = activeRecipient
    ? messages.filter((m) => m.recipientPhone === activeRecipient.phone || m.phone === activeRecipient.phone)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp Sales Conversations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time WhatsApp outreach and client messaging integrated into CRM history.
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsNewChatModalOpen(true)}>
          New Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[560px]">
        {/* Contact List */}
        <Card padding="none" className="overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Contacts & Chats</span>
            <span className="text-[10px] font-semibold text-slate-400">{contacts.length} Available</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {contacts.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No active conversations</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Add contacts or leads with phone numbers to start WhatsApp outreach.
                </p>
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Start Chat
                </button>
              </div>
            ) : (
              contacts.map((c, idx) => {
                const isSelected = activeRecipient?.phone === c.phone;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveRecipient(c)}
                    className={`p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-indigo-50/60 font-semibold' : ''
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.phone}</p>
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Active Chat Conversation Area */}
        <Card padding="none" className="md:col-span-2 flex flex-col overflow-hidden bg-slate-50/30">
          {!activeRecipient ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">No Conversation Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Select a contact from the left list or click "New Chat" to begin a WhatsApp sales conversation.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{activeRecipient.name}</h3>
                  <p className="text-[11px] text-slate-500">{activeRecipient.phone}</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  WhatsApp Business
                </span>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                    <p>No messages sent to {activeRecipient.name} yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Send your first message below.</p>
                  </div>
                ) : (
                  activeMessages.map((m) => {
                    const isOut = m.direction === 'outgoing';
                    return (
                      <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                            isOut
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                          }`}
                        >
                          <p>{m.message}</p>
                          <div
                            className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                              isOut ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isOut && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${activeRecipient.name}...`}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" icon={Send}>
                  Send
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>

      {/* New Chat Modal */}
      <Modal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        title="Start WhatsApp Conversation"
        subtitle="Message a contact or new client directly via WhatsApp"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsNewChatModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartNewChat}>Start Chat</Button>
          </>
        }
      >
        <form onSubmit={handleStartNewChat} className="space-y-4">
          <Input
            label="Recipient Name"
            value={newChatData.name}
            onChange={(e) => setNewChatData({ ...newChatData, name: e.target.value })}
            placeholder="e.g. Ramesh Gupta"
          />
          <Input
            label="Phone Number"
            required
            value={newChatData.phone}
            onChange={(e) => setNewChatData({ ...newChatData, phone: e.target.value })}
            placeholder="+91 98200 12345"
          />
        </form>
      </Modal>
    </div>
  );
};

