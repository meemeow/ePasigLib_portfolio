import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Text } from "@/components/ui/Text";
import { Textarea } from "@/components/ui/Textarea";
import { User, IdCard, ShieldCheck, Info } from "lucide-react";
import type { VerifyPatron } from "@/features/lms/patrons/pages/verify-patron/types/patrons-verify-types";

interface Props {
  formData: VerifyPatron;
  isProcessing: boolean;
  onClose: () => void;
  onSubmit: (action: "approve" | "reject", remarks: string) => Promise<void>;
}

interface PersonalInfoField {
  label: string;
  key: keyof VerifyPatron;
  value?: string;
  fullWidth?: boolean;
}

const personalInfoFields: PersonalInfoField[] = [
  { label: "First Name", key: "FirstName" },
  { label: "Middle Name", key: "MiddleName" },
  { label: "Last Name", key: "LastName" },
  { label: "Suffix", key: "Suffix" },
  { label: "Birth Date", key: "BirthDate" },
  { label: "Sex", key: "Sex" },
  { label: "City", key: "City" },
  { label: "Barangay", key: "Barangay" },
  { label: "Education/Work Status", key: "SchoolWork" },
  { label: "Role", key: "Role", value: "Patron" },
  { label: "Email", key: "Email", fullWidth: true },
];

export const PatronInformationModal: React.FC<Props> = ({
  formData,
  isProcessing,
  onClose,
  onSubmit,
}) => {
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState("");

  const fullName =
    `${formData.FirstName || ""} ${formData.LastName || ""}`.trim();

  useEffect(() => {
    setConfirmChecked(false);
    setShowRemarks(false);
    setRemarks("");
  }, [formData]);

  const handleReject = () => setShowRemarks(true);

  const handleApprove = () => onSubmit("approve", "");

  const handleRejectWithRemarks = () => onSubmit("reject", remarks);

  const renderField = (field: PersonalInfoField) => {
    const value =
      field.value !== undefined ? field.value : (formData[field.key] ?? "");
    const displayValue = value || (
      <span className="italic text-gray-400">N/A</span>
    );
    return (
      <div
        key={field.key}
        className={field.fullWidth ? "sm:col-span-2 space-y-1" : "space-y-1"}
      >
        <Text className="text-xs text-gray-500 font-[gothamMedium]">
          {field.label}
        </Text>
        <Text className="text-sm text-gray-900 font-[gothamLight]">
          {displayValue}
        </Text>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center px-6 md:px-10 z-50">
        <div className="w-full max-w-6xl max-h-[85vh] overflow-hidden rounded-xl border bg-white shadow-2xl flex flex-col">
          <div className="bg-[#003067] px-6 py-4 sm:px-8 sm:py-5 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white">
                  <User className="size-5" />
                </div>
                <div>
                  <Text className="font-[gothamMedium] text-base sm:text-lg text-white">
                    Review Patron
                  </Text>
                  <Text className="text-xs sm:text-sm text-white/70">
                    Review {fullName || "patron"}'s information before
                    verification
                  </Text>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 md:px-10 md:py-8">
            <div className="grid grid-cols-1 2xl:gap-8 2xl:grid-cols-2 gap-6 md:gap-12">
              <div className="space-y-6 border-b border-gray-200 pb-6 md:pb-12 2xl:border-b-0 2xl:pb-0 2xl:border-r 2xl:border-gray-200 2xl:pr-8">
                <div>
                  <div className="flex items-start gap-3 mb-6 md:mb-8">
                    <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
                      <User className="size-4 md:size-5" />
                    </div>
                    <div>
                      <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                        Personal Information
                      </Text>
                      <Text className="text-xs md:text-sm text-gray-500">
                        Review the patron's personal details.
                      </Text>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-y-3 gap-x-5 md:gap-x-12 md:gap-y-5 sm:grid-cols-2">
                    {personalInfoFields.map(renderField)}
                  </div>
                </div>
              </div>

              <div className="space-y-6 my-auto">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center my-auto rounded-full bg-[#EAF4FE] text-[#128CF1]">
                    <IdCard className="size-4 md:size-5" />
                  </div>
                  <div>
                    <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                      ID Preview
                    </Text>
                    <Text className="text-xs md:text-sm text-gray-500">
                      View the patron's uploaded ID document.
                    </Text>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-[#EAF4FE] px-4 py-3">
                  <Info className="size-3 md:size-4 shrink-0 text-[#128CF1]" />
                  <Text className="text-xs md:text-sm text-[#0B2545]">
                    Review the ID carefully before approving or rejecting.
                  </Text>
                </div>

                <div className="flex justify-center items-center p-4 border rounded-lg bg-gray-50 min-h-[200px]">
                  {formData.ID ? (
                    <img
                      src={formData.ID}
                      alt="Patron ID"
                      className="max-h-70 rounded-md border shadow w-full max-w-[120px] sm:max-w-[180px] md:max-w-xs lg:max-w-sm object-contain"
                    />
                  ) : (
                    <Text className="text-gray-500 text-sm italic">N/A</Text>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t bg-white px-6 py-4 sm:px-8 sm:py-5 md:px-10">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1]">
                      <ShieldCheck className="size-4 md:size-5" />
                    </div>
                    <div>
                      <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                        Verify Account
                      </Text>
                      {formData.State === "Unverified" && !showRemarks ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={confirmChecked}
                            onCheckedChange={(val) =>
                              setConfirmChecked(Boolean(val))
                            }
                            disabled={isProcessing}
                            id="confirm-decision"
                            className="h-4 w-4 shrink-0 border-gray-400 border-2"
                          />
                          <Text className="text-xs text-gray-500">
                            I understand that I am confirming the decision to
                            verify or reject this patron's account.
                          </Text>
                        </div>
                      ) : (
                        <Text className="text-xs text-gray-500">
                          Provide rejection remarks. These will be sent to the
                          patron.
                        </Text>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                  {formData.State === "Unverified" && !showRemarks ? (
                    <>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button
                          variant="outline"
                          onClick={onClose}
                          disabled={isProcessing}
                          className="min-w-[100px] order-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={!confirmChecked || isProcessing}
                          className="min-w-[100px] order-2"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="success"
                          onClick={handleApprove}
                          disabled={!confirmChecked || isProcessing}
                          className="min-w-[100px] order-3"
                        >
                          {isProcessing ? "Verifying..." : "Verify"}
                        </Button>
                      </div>
                    </>
                  ) : showRemarks ? (
                    <>
                      <div className="w-full sm:min-w-[200px] md:min-w-[300px] lg:min-w-[400px] xl:min-w-[450px] space-y-1">
                        <Text className="text-xs font-semibold text-red-700">
                          Remarks (required for rejection)
                        </Text>
                        <Textarea
                          className="p-2 min-h-[80px] text-sm sm:text-sm shadow-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:border-input"
                          rows={3}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Reason for rejection..."
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setShowRemarks(false)}
                          disabled={isProcessing}
                          className="min-w-[100px]"
                        >
                          Back
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleRejectWithRemarks}
                          disabled={isProcessing || !remarks.trim()}
                          className="min-w-[140px]"
                        >
                          {isProcessing ? "Rejecting..." : "Reject & Notify"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={isProcessing}
                      className="min-w-[100px]"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
