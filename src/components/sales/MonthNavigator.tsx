"use client";

import { useRouter } from "next/navigation";
import DatePickerField from "@/components/ui/DatePickerField";

export default function MonthNavigator({ month }: { month: string }) {
  const router = useRouter();
  return (
    <div className="w-full sm:w-72">
      <DatePickerField
        label="Pilih bulan laporan"
        value={`${month}-01`}
        onChange={(value) => router.push(`?month=${value.slice(0, 7)}`)}
      />
    </div>
  );
}
