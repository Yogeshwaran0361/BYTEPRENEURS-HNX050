import { Alert, AlertWorkflowStatus, AlertType, ServiceResponse } from '../types';
import { alertEngineService } from './engine/alertEngineService';

export interface AlertService {
  getAlerts(
    caregiverId?: string,
    statusFilter?: AlertWorkflowStatus | 'ALL',
    typeFilter?: AlertType | 'ALL'
  ): Promise<ServiceResponse<Alert[]>>;
  acknowledgeAlert(alertId: string, caregiverId?: string): Promise<ServiceResponse<Alert>>;
  resolveAlert(alertId: string, caregiverId?: string): Promise<ServiceResponse<Alert>>;
}

class AlertServiceImpl implements AlertService {
  async getAlerts(
    caregiverId?: string,
    statusFilter?: AlertWorkflowStatus | 'ALL',
    typeFilter?: AlertType | 'ALL'
  ): Promise<ServiceResponse<Alert[]>> {
    return alertEngineService.getAlertsForCaregiver(caregiverId, statusFilter, typeFilter);
  }

  async acknowledgeAlert(alertId: string, caregiverId?: string): Promise<ServiceResponse<Alert>> {
    return alertEngineService.markAlertReviewed(alertId, caregiverId);
  }

  async resolveAlert(alertId: string, caregiverId?: string): Promise<ServiceResponse<Alert>> {
    return alertEngineService.resolveAlert(alertId, caregiverId);
  }
}

export const alertService = new AlertServiceImpl();
