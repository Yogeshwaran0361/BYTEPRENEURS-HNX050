import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { medicineService } from '../../services/medicineService';
import { Medicine } from '../../types';
import { Pill, Plus, Clock, ArrowRight, Utensils, Search, CheckCircle, PauseCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const SeniorMedicinesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const loadMedicines = async () => {
    setIsLoading(true);
    try {
      const res = await medicineService.getMedicines(undefined, filter, search);
      setMedicines(res.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, [filter, search]);

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader
        title={t('senior.myMedicines', 'My Medicines')}
        subtitle={t('senior.medicinesSubtitle', 'Review, manage, and add medications in your care plan.')}
        breadcrumbs={[
          { label: t('nav.home', 'Home'), href: '/senior/dashboard' },
          { label: t('nav.medicines', 'My Medicines') },
        ]}
        actions={
          <Link to="/senior/medicines/add">
            <Button
              variant="primary"
              size="large"
              leftIcon={<Plus className="w-5 h-5 stroke-[2.5]" />}
            >
              {t('senior.addMedicine', 'Add Medicine')}
            </Button>
          </Link>
        }
      />

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filter */}
        <div className="inline-flex p-1 bg-nest-surface-subtle border border-nest-border rounded-tactile gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-bold rounded transition-colors ${
              filter === 'all'
                ? 'bg-nest-surface text-nest-ink shadow-sm'
                : 'text-nest-ink-muted hover:text-nest-ink'
            }`}
          >
            {t('senior.allMedicines', 'All Medicines')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-4 py-2 text-sm font-bold rounded transition-colors ${
              filter === 'active'
                ? 'bg-olive-100 text-olive-900 shadow-sm'
                : 'text-nest-ink-muted hover:text-nest-ink'
            }`}
          >
            {t('senior.activeOnly', 'Active Only')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('paused')}
            className={`px-4 py-2 text-sm font-bold rounded transition-colors ${
              filter === 'paused'
                ? 'bg-sand-200 text-nest-ink shadow-sm'
                : 'text-nest-ink-muted hover:text-nest-ink'
            }`}
          >
            {t('senior.pausedOnly', 'Paused Only')}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-nest-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('senior.searchPlaceholder', 'Search medicine name...')}
            className="w-full pl-10 pr-4 py-2 rounded-tactile border border-nest-border bg-nest-surface text-nest-ink text-base focus:outline-none focus:ring-2 focus:ring-terracotta-500"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message={t('common.loading', 'Loading...')} />
      ) : medicines.length === 0 ? (
        <EmptyState
          title={search || filter !== 'all' ? t('senior.noMedicinesFound', 'No medications found') : t('senior.noMedicines', 'No medications scheduled for today.')}
          description={
            search || filter !== 'all'
              ? t('senior.noMedicinesDesc', 'No medications match your filter or search criteria.')
              : t('senior.todaySub', 'Add your first medicine to create your daily routine.')
          }
          actionLabel={search || filter !== 'all' ? t('common.all', 'All') : t('senior.addMedicine', 'Add Medicine')}
          onAction={() => {
            if (search || filter !== 'all') {
              setSearch('');
              setFilter('all');
            } else {
              navigate('/senior/medicines/add');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicines.map((med) => (
            <Card
              key={med.id}
              variant={med.is_active ? 'default' : 'subtle'}
              isInteractive
              onClick={() => navigate(`/senior/medicines/${med.id}`)}
              className="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-12 h-12 rounded-tactile border flex items-center justify-center shrink-0 ${
                        med.is_active
                          ? 'bg-terracotta-50 text-terracotta-600 border-terracotta-200'
                          : 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border'
                      }`}
                    >
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-nest-ink tracking-tight">
                        {med.name}
                      </h3>
                      {med.type && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-nest-surface-subtle border border-nest-border text-nest-ink-muted uppercase">
                          {med.type}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${
                      med.is_active
                        ? 'bg-olive-50 text-olive-800 border-olive-200'
                        : 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border'
                    }`}
                  >
                    {med.is_active ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-olive-600" />
                        {t('senior.activeOnly', 'Active')}
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-3.5 h-3.5 text-nest-ink-muted" />
                        {t('senior.pausedOnly', 'Paused')}
                      </>
                    )}
                  </span>
                </div>

                {/* Amount / Dosage */}
                <div className="my-3 p-3 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-nest-ink-muted">{t('senior.dosage', 'Dosage')}</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-terracotta-700">{med.dosage}</span>
                    {med.taking_capacity ? (
                      <span className="text-xs text-nest-ink-muted block">({med.taking_capacity})</span>
                    ) : med.amount_per_dose ? (
                      <span className="text-xs text-nest-ink-muted block">({med.amount_per_dose})</span>
                    ) : null}
                  </div>
                </div>

                {/* When / Frequency */}
                <div className="space-y-1.5 text-sm text-nest-ink">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-nest-ink-muted shrink-0" />
                    <span className="font-medium">
                      {med.frequency || 'Daily'}
                      {med.scheduled_times && med.scheduled_times.length > 0 && (
                        <> • {med.scheduled_times.join(', ')}</>
                      )}
                    </span>
                  </div>

                  {med.food_relation && med.food_relation !== 'Not specified' && (
                    <div className="flex items-center gap-2 text-nest-ink-muted">
                      <Utensils className="w-4 h-4 text-nest-ink-muted shrink-0" />
                      <span>{med.food_relation}</span>
                    </div>
                  )}

                  {med.additional_instructions && (
                    <p className="text-xs text-nest-ink-muted italic line-clamp-2 mt-1">
                      "{med.additional_instructions}"
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-nest-border flex items-center justify-between gap-2">
                <VoiceReminderButton
                  medicine={med}
                  variant="default"
                  size="small"
                />
                <div className="flex items-center gap-1 text-base font-bold text-terracotta-600 hover:text-terracotta-700">
                  <span>{t('common.viewDetails', 'View Details')}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
