"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themes = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="icon-button theme-trigger"
            aria-label="Choose appearance"
          />
        }
      >
        <Sun className="theme-sun" size={18} />
        <Moon className="theme-moon" size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="theme-menu">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          {themes.map(({ value, label, Icon }) => (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
              <Icon size={15} />
              <span>{label}</span>
              {theme === value && <Check className="ml-auto" size={14} />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <p className="theme-menu-note">Saved on this device</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
