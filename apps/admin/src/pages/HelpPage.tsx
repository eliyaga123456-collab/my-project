import { Eye, EyeOff, Lightbulb } from "lucide-react";
import { useT, type Key } from "../i18n";
import { Card, PageHeader } from "../ui";

const PAGES: Key[] = ["help.overview", "help.rounds", "help.activity", "help.users", "help.reports", "help.moderation", "help.abuse", "help.audit", "help.health"];

export function HelpPage() {
  const { t } = useT();
  return (
    <>
      <PageHeader title={t("help.title")} subtitle={t("help.subtitle")} />
      <div className="stack">
        <Card title={<><Eye size={18} aria-hidden className="ico-ok" /> {t("help.canTitle")}</>}>
          <ul className="help-list"><li>{t("help.can1")}</li><li>{t("help.can2")}</li><li>{t("help.can3")}</li></ul>
        </Card>
        <Card title={<><EyeOff size={18} aria-hidden className="ico-no" /> {t("help.cantTitle")}</>}>
          <ul className="help-list"><li>{t("help.cant1")}</li><li>{t("help.cant2")}</li></ul>
        </Card>
        <Card title={t("help.pages")}>
          <ul className="help-list">{PAGES.map((k) => <li key={k}>{t(k)}</li>)}</ul>
        </Card>
        <Card title={<><Lightbulb size={18} aria-hidden className="ico-tip" /> {t("help.tipTitle")}</>}><p>{t("help.tip")}</p></Card>
      </div>
    </>
  );
}
