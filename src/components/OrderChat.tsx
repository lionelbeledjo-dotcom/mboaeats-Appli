import { useEffect, useRef, useState } from "react";
import { Send, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: "client" | "driver";
  body: string;
  created_at: string;
  read_at: string | null;
};

type Props = {
  orderId: string;
  meId: string;
  meRole: "client" | "driver";
  peerName?: string;
};

export function OrderChat({ orderId, meId, meRole, peerName = "Livreur" }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("order_messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMessages(data as Msg[]);
        const u = (data as Msg[]).filter((m) => m.sender_id !== meId && !m.read_at).length;
        setUnread(u);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, meId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== meId) {
            if (!open) setUnread((n) => n + 1);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orderId, meId, open]);

  // Auto-scroll & mark read on open
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
    setUnread(0);
    const unreadIds = messages.filter((m) => m.sender_id !== meId && !m.read_at).map((m) => m.id);
    if (unreadIds.length) {
      supabase.from("order_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).then(() => {});
    }
  }, [open, messages, meId]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await supabase.from("order_messages").insert({
      order_id: orderId,
      sender_id: meId,
      sender_role: meRole,
      body,
    });
    setSending(false);
    if (error) {
      toast.error("Message non envoyé");
      return;
    }
    setText("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
        style={{ backgroundColor: "#06C167" }}
        aria-label="Ouvrir le chat avec le livreur"
      >
        <MessageCircle className="h-5 w-5" />
        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: "#E53935" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#F4F4F4" }}>
              <div>
                <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
                  Chat avec {peerName}
                </p>
                <p className="text-[11px]" style={{ color: "#888888" }}>
                  Messages liés à votre commande
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "#F4F4F4" }}
                aria-label="Fermer"
              >
                <X className="h-4 w-4" style={{ color: "#1A1A1A" }} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3" style={{ backgroundColor: "#F5F0E8" }}>
              {messages.length === 0 && (
                <p className="mt-10 text-center text-xs" style={{ color: "#888888" }}>
                  Aucun message. Envoyez le premier 👋
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm"
                      style={{
                        backgroundColor: mine ? "#06C167" : "#FFFFFF",
                        color: mine ? "#FFFFFF" : "#1A1A1A",
                      }}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className="mt-1 text-right text-[10px]"
                        style={{ color: mine ? "rgba(255,255,255,0.85)" : "#888888" }}
                      >
                        {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t bg-white px-3 py-2"
              style={{ borderColor: "#F4F4F4" }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écrire un message…"
                maxLength={1000}
                className="flex-1 rounded-full border px-4 py-2 text-sm outline-none focus:border-[#06C167]"
                style={{ borderColor: "#E5E5E5", color: "#1A1A1A" }}
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
                style={{ backgroundColor: "#06C167" }}
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
