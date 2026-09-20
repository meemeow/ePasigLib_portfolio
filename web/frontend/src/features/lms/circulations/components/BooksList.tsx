import type { CirculationBookRef } from "@/features/lms/circulations/types/circulation-records-types";

interface BooksListProps {
  books: CirculationBookRef[];
}

export default function BooksList({ books }: BooksListProps) {
  if (!books || books.length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <ul className="space-y-2">
      {books.map((book, index) => (
        <li
          key={`${book.BookID}_${book.Accession}_${index}`}
          className="whitespace-normal break-words"
        >
          <div>{book.CollectionTitle || "Untitled"}</div>
          {book.Accession && (
            <div className="mt-0.5 font-mono text-xs text-gray-500">
              {book.Accession}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
