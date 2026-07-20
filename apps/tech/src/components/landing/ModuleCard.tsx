import React from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

type ModuleCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  features?: string[];
  href?: string;
  disabled?: boolean;
  accentColor?: string;
  accentBg?: string;
};

export function ModuleCard({
  icon,
  title,
  description,
  features,
  href,
  disabled = false,
  accentColor = "text-indigo-400",
  accentBg = "bg-indigo-500/10",
}: ModuleCardProps) {
  const content = (
    <div
      className={[
        "group relative h-full flex flex-col p-6 rounded-2xl border transition-all duration-300",
        "bg-white/[0.03] backdrop-blur-sm border-white/[0.07]",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40",
      ].join(" ")}
    >
      {/* Icon */}
      <div
        className={`inline-flex p-3 rounded-xl mb-5 w-fit ${accentBg} transition-colors group-hover:scale-110 duration-300`}
      >
        <span className={accentColor}>{icon}</span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-white/40 leading-relaxed mb-4">{description}</p>

      {/* Features list */}
      {features && features.length > 0 && (
        <ul className="space-y-2 mb-6 flex-grow">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-white/30">
              <div className={`w-1 h-1 rounded-full flex-shrink-0 ${accentColor.replace("text-", "bg-")}`} />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Bottom action */}
      <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-center justify-between">
        {disabled ? (
          <>
            <span className="text-xs text-white/20 font-medium uppercase tracking-widest">
              Próximamente
            </span>
            <Lock className="w-3.5 h-3.5 text-white/20" />
          </>
        ) : (
          <>
            <span className={`text-sm font-semibold ${accentColor}`}>
              Acceder
            </span>
            <ArrowRight
              className={`w-4 h-4 ${accentColor} transition-transform duration-200 group-hover:translate-x-1`}
            />
          </>
        )}
      </div>
    </div>
  );

  if (disabled || !href) {
    return content;
  }

  const isExternal = href.startsWith("http");
  if (isExternal) {
    return (
      <a href={href} className="block h-full" target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
