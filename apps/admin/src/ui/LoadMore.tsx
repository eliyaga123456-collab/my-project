import { useT } from "../i18n";
import { Button } from "./Button";

export function LoadMore({ hasMore, loading, error, onClick, shown }: { hasMore: boolean; loading: boolean; error: string | null; onClick: () => void; shown: number }) {
  const { t, tn } = useT();
  return (
    <div className="load-more">
      {error && <p className="text-danger" role="alert">{error}</p>}
      {hasMore ? <Button onClick={onClick} loading={loading}>{error ? t("common.retry") : t("common.loadMore")}</Button> : <span className="muted">{tn("common.loaded", shown)}</span>}
    </div>
  );
}
