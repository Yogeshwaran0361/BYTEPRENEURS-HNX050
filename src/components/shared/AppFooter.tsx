import React from 'react';
import { Logo } from './Logo';
import { MedicalSafetyNotice } from './MedicalSafetyNotice';
import { Heart, ShieldCheck, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AppFooter: React.FC = () => {
  return (
    <footer className="bg-[#F3EFE9] border-t border-nest-border mt-16 text-nest-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2 space-y-3">
            <Logo size="large" />
            <p className="text-base text-nest-ink-muted max-w-md leading-relaxed">
              Senior-Centric Medication Management & Caregiver Support. Designed for clarity, confidence, and reassurance through the five-step care journey.
            </p>
            <div className="flex items-center gap-4 text-sm text-nest-ink-muted pt-2">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Eye className="w-4 h-4 text-terracotta-500" /> Atkinson Hyperlegible
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-olive-600" /> Non-Clinical Guardrails
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-bold text-nest-ink mb-3 tracking-tight">Portals</h4>
            <ul className="space-y-2 text-base text-nest-ink-muted">
              <li>
                <Link to="/senior/dashboard" className="hover:text-terracotta-600 transition-colors">
                  Senior Portal
                </Link>
              </li>
              <li>
                <Link to="/caregiver/dashboard" className="hover:text-terracotta-600 transition-colors">
                  Caregiver Portal
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-terracotta-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-terracotta-600 transition-colors">
                  Our Philosophy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base font-bold text-nest-ink mb-3 tracking-tight">Care Journey</h4>
            <ol className="space-y-1.5 text-sm text-nest-ink-muted">
              <li>1. <strong className="text-nest-ink">Understand</strong> routine</li>
              <li>2. <strong className="text-nest-ink">Remember</strong> schedule</li>
              <li>3. <strong className="text-nest-ink">Act</strong> on time</li>
              <li>4. <strong className="text-nest-ink">Confirm</strong> intake</li>
              <li>5. <strong className="text-nest-ink">Support</strong> family & care</li>
            </ol>
          </div>
        </div>

        <MedicalSafetyNotice />

        <div className="border-t border-nest-border/80 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-nest-ink-muted">
          <p>© {new Date().getFullYear()} NESTCARE. Built with calm, accessible care.</p>
          <div className="flex items-center gap-1 text-xs text-nest-ink-faint">
            <span>Designed for older adults and authorized caregivers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
