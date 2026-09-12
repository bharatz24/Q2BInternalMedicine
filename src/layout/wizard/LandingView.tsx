import HubMarketing from "@/shared/components/desktop/HubMarketing";
import HubCOIPreview from "@/shared/components/desktop/HubCOIPreview";
import MedMalGuardLanding, {
  MedMalGuardFooter,
  MedMalGuardMap,
} from "@/modules/Quote/components/MedMalGuardLanding";

/**
 * The public landing route (`/`). Its own full-bleed page: the MedMalGuard
 * "Claude1" hero + calculator, the state map, then the retained desktop
 * hub sections (COI previewer + marketing) and the — currently empty —
 * dark-footer slot.
 *
 * `FlowLayout` renders this instead of `<WizardChrome>` when the path is
 * exactly `/`. The wizard funnel guards (`useWizardGuards`) still run in
 * `FlowLayout` first, so e.g. a bound-policy user is bounced to
 * `/complete-order` before this mounts — same as before the split.
 *
 * Nothing here is conditional: on `/`, the map + both hub sections + the
 * footer slot always render (the old `isLanding` / `showHubMarketing`
 * flags were both always true on this route).
 */
export default function LandingView() {
  return (
    <>
      <MedMalGuardLanding />
      <MedMalGuardMap />
      <HubCOIPreview />
      <HubMarketing />
      <MedMalGuardFooter />
    </>
  );
}
