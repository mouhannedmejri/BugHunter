import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface MDPreviewProps {
  content: string;
  className?: string;
}

export const MDPreview = ({ content, className }: MDPreviewProps) => (
  <div className={`prose prose-sm max-w-none ${className ?? ""}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
      {content}
    </ReactMarkdown>
  </div>
);
