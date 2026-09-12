import { memo } from "react";

// Flex filler — pushes trailing content to the bottom of a column.
// Styling lives in src/styles/ui.css (.ui-spacer); see ADR 0004.
// `memo` + no props → never re-renders once mounted.
export const Spacer = memo(() => <div className="ui-spacer" />);
