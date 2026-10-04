import { Button } from "./Button";

export function LoadMore({ hasMore, loading, error, onClick, shown }: { hasMore: boolean; loading: boolean; error: string | null; onClick: () => void; shown: number }) {
  return (
    <div className="load-more">
      {error && <p className="text-danger" role="alert">{error}</p>}
      {hasMore ? <Button onClick={onClick} loading={loading}>{error ? "Retry" : "Load more"}</Button> : <span className="muted">{shown} loaded, that's everything</span>}
    </div>
  );
}
