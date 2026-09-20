import { Info, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Text } from "@/components/ui/Text";
import {
  STAFF_ROLE_GROUPS,
  formatPermissionLabel,
} from "@/lib/constants/staff-role-groups";
import type { StaffRoles } from "@/lib/auth/auth-types";

interface ProfileRolesProps {
  staffRoles: StaffRoles | null;
  jobTitle?: string;
}

export default function ProfileRoles({
  staffRoles,
  jobTitle,
}: ProfileRolesProps) {
  const grantedCount = STAFF_ROLE_GROUPS.reduce(
    (total, group) =>
      total + group.permissions.filter((perm) => staffRoles?.[perm]).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="my-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1] md:h-10 md:w-10">
          <ShieldCheck className="size-4 md:size-5" />
        </div>
        <div>
          <Text className="font-[gothamMedium] text-base text-[#003067] md:text-lg">
            Roles &amp; Permissions
          </Text>
          <Text className="text-xs text-gray-500 md:text-sm">
            The permissions assigned to your account by an administrator.
          </Text>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-[#EAF4FE] px-4 py-3">
        <Info className="size-3 shrink-0 text-[#128CF1] md:size-4" />
        <Text className="text-xs text-[#0B2545] md:text-sm">
          {jobTitle === "Admin"
            ? "You are an Admin, so every permission is granted."
            : `You currently have ${grantedCount} permission${grantedCount === 1 ? "" : "s"}. Contact an administrator to request changes.`}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAFF_ROLE_GROUPS.map(({ label, icon: Icon, permissions }) => (
          <div key={label} className="space-y-4 rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 font-[gothamMedium] text-[#003067]">
              <Icon className="size-4 text-[#128CF1]" />
              {label}
            </div>
            <div className="space-y-3">
              {permissions.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center gap-2 text-sm font-normal text-gray-700"
                >
                  <Checkbox checked={Boolean(staffRoles?.[perm])} disabled />
                  {formatPermissionLabel(perm)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
