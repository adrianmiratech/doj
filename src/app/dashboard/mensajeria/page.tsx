import { MessageCircle } from "lucide-react";

export default function MensajeriaPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
      <MessageCircle className="h-8 w-8 text-text-muted" />
      <p className="text-sm text-text-muted">Elige una conversación de la izquierda, o inicia un mensaje privado.</p>
    </div>
  );
}
