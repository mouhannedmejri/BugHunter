interface MarkdownContentProps {
  body: string;
}

export const MarkdownContent = ({ body }: MarkdownContentProps) => {
  // Simple markdown rendering — converts basic markdown to HTML safely
  const rendered = body
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-foreground mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-foreground mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-muted-foreground">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return (
    <div
      className="prose-sm text-sm text-muted-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};
