import { ListSkeleton, Skeleton } from "@/components/ui";
import { getT } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getT();
  return (
    <div>
      <Skeleton className="mb-6 h-9 w-40" />
      <ListSkeleton rows={3} label={t("common.state.loading")} />
    </div>
  );
}
