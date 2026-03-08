import BudgetMonitor from '../costs/budgetMonitor';

export interface CloudResource {
    id: string;
    type: 'spot_instance' | 'lambda' | 'storage';
    provider: 'aws' | 'gcp' | 'azure';
    costPerHour: number;
    startTime: number;
    status: 'provisioning' | 'active' | 'terminated';
}

/**
 * Cloud Provisioner — Phase 8 Infrastructure Metabolism
 * 
 * Allows Jarvis to autonomously scale compute resources.
 * Strictly bound to BudgetMonitor to avoid runaway costs.
 */
export class CloudProvisioner {
    private budgetMonitor: BudgetMonitor;
    private activeResources: Map<string, CloudResource> = new Map();

    constructor(budgetMonitor: BudgetMonitor) {
        this.budgetMonitor = budgetMonitor;
    }

    /**
     * Provision a temporary resource for a specific squad mission
     */
    async provisionResource(squadId: string, type: CloudResource['type']): Promise<string | null> {
        // 1. Check budget first
        if (this.budgetMonitor.isOverBudget(squadId)) {
            console.error(`[CloudProvisioner] Provisioning BLOCKED: Squad ${squadId} is over budget.`);
            return null;
        }

        const id = `res_${Date.now()}`;
        const resource: CloudResource = {
            id,
            type,
            provider: 'aws', // Default for now
            costPerHour: type === 'spot_instance' ? 0.05 : 0.01,
            startTime: Date.now(),
            status: 'active'
        };

        console.log(`[CloudProvisioner] Provisioning ${type} for squad ${squadId}...`);
        this.activeResources.set(id, resource);

        return id;
    }

    /**
     * Terminate a resource when mission is done
     */
    async terminateResource(resourceId: string): Promise<void> {
        const resource = this.activeResources.get(resourceId);
        if (resource) {
            const durationHours = (Date.now() - resource.startTime) / 3600000;
            const finalCost = durationHours * resource.costPerHour;

            console.log(`[CloudProvisioner] Terminating resource ${resourceId}. Final cost: $${finalCost.toFixed(4)}`);

            // In a real implementation, this would call AWS SDK/Terraform
            this.activeResources.delete(resourceId);
        }
    }

    /**
     * Get total hourly burn rate
     */
    getBurnRate(): number {
        let total = 0;
        for (const res of this.activeResources.values()) {
            total += res.costPerHour;
        }
        return total;
    }
}
