import { Download, FileText } from "lucide-react";
import { Text } from "@/components/ui/Text";
import type {
  UpdateFile,
} from "@/features/lms/library-desk/types/updates-types";

export default function AttachmentList({ files }: { files: UpdateFile[] }) {
  if (files.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {files.map((file) => (
        <li key={file.URL}>
          <a
            href={file.URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 transition-colors hover:border-[#128CF1] hover:bg-[#EAF4FE]"
          >
            <FileText className="size-4 shrink-0 text-[#128CF1]" />
            <Text className="min-w-0 truncate text-xs text-[#011b38]">
              {file.Name}
            </Text>
            <Download className="size-3.5 shrink-0 text-gray-400 group-hover:text-[#128CF1]" />
          </a>
        </li>
      ))}
    </ul>
  );
}
