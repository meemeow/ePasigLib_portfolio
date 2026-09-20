import { Button } from "@/components/ui/Button";

type ProceedToOpacButtonProps = {
  onClick: () => void;
};

export default function ProceedToOpacButton({
  onClick,
}: ProceedToOpacButtonProps) {
  return (
    <div className="flex w-full justify-center max-md:mt-6 md:w-auto md:fixed md:right-5 md:bottom-5 md:z-50">
      <Button variant="default" className="w-full md:w-auto" onClick={onClick}>
        PROCEED TO OPAC
      </Button>
    </div>
  );
}
