import type { NavigationMenuItem } from "../../types/navigation";
import { ui } from "../../i18n/messages";

export const SIDEBAR_MIN_WIDTH_PERCENT = 20;
export const SIDEBAR_MAX_WIDTH_PERCENT = 30;

export const NAVIGATION_MENU_ITEMS: NavigationMenuItem[] = [
  { title: ui.navigation.menuFile },
  { title: ui.navigation.menuHelp },
];
