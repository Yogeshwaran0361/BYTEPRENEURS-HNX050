import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { MedicalSafetyNotice } from '../../components/shared/MedicalSafetyNotice';
import { Eye, HeartHandshake, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title="About NESTCARE"
        subtitle="Rethinking medication management through calm tactile care and caregiver connection."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]}
      />

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-nest-ink">Why NESTCARE Exists</h2>
        <p className="text-lg text-nest-ink-muted leading-relaxed">
          Generic reminder apps fail older adults because they treat complex multi-drug routines like smartphone alarm clocks. Older adults often take multiple medications with varying food requirements, different times of day, and confusing instructions. When an alarm beeps without context, it causes anxiety, not adherence.
        </p>
        <p className="text-lg text-nest-ink-muted leading-relaxed">
          NESTCARE re-centers medication management around the human relationship between an older adult and their family or authorized caregiver.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <Card variant="warm">
          <CardContent className="space-y-3">
            <div className="w-10 h-10 rounded-tactile bg-terracotta-100 text-terracotta-700 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-nest-ink">Atkinson Hyperlegible</h3>
            <p className="text-base text-nest-ink-muted leading-relaxed">
              Developed by the Braille Institute, Atkinson Hyperlegible focuses on letterform distinction to increase character recognition and improve reading speed for readers with low vision.
            </p>
          </CardContent>
        </Card>

        <Card variant="warm">
          <CardContent className="space-y-3">
            <div className="w-10 h-10 rounded-tactile bg-olive-100 text-olive-700 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-nest-ink">Calm Tactile Surfaces</h3>
            <p className="text-base text-nest-ink-muted leading-relaxed">
              We replace clinical hospital blues and harsh white backgrounds with warm ivory tones, soft borders, and comfortable touch targets designed to evoke a trusted personal notebook.
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-nest-ink">Guiding Principles</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-tactile bg-nest-surface border border-nest-border">
            <CheckCircle2 className="w-5 h-5 text-olive-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-nest-ink block text-lg">Single obvious next action</strong>
              <p className="text-base text-nest-ink-muted">A senior should never wonder what to do next. The interface prominently surfaces the immediate dose and action.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-tactile bg-nest-surface border border-nest-border">
            <CheckCircle2 className="w-5 h-5 text-olive-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-nest-ink block text-lg">No color-only semantics</strong>
              <p className="text-base text-nest-ink-muted">Every state utilizes explicit text descriptions, distinct icons, and accessible contrast to prevent confusion.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-tactile bg-nest-surface border border-nest-border">
            <CheckCircle2 className="w-5 h-5 text-olive-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-nest-ink block text-lg">Connected, not surveilled</strong>
              <p className="text-base text-nest-ink-muted">Caregivers are alerted when support is needed, preserving independence while offering a dependable safety net.</p>
            </div>
          </div>
        </div>
      </section>

      <MedicalSafetyNotice />

      <div className="pt-6 flex justify-center">
        <Link to="/">
          <Button size="large">Get Started with NESTCARE</Button>
        </Link>
      </div>
    </div>
  );
};
