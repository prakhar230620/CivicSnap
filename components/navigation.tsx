"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", href: "/" },
  ]

  return (
    <nav className="bg-slate-900 text-white py-3 px-4 mb-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-lg">CivicSnap</div>
        <ul className="flex space-x-4">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "px-3 py-1 rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                )}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}