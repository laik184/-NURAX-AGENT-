import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Usage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold" data-testid="text-usage-title">
            Usage
          </h1>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="p-4 bg-orange-500/10 border-orange-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                You don't have a payment method on file. Click here to add one and avoid service interruptions.
              </p>
            </div>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="heading-billing-overview">
              Billing overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Your plan</h3>
                  <div className="text-base font-semibold" data-testid="text-plan">Starter</div>
                  <button className="text-primary text-sm hover:underline" data-testid="link-upgrade">
                    Upgrade to Replit Core
                  </button>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Usage period</h3>
                  <div className="text-base" data-testid="text-usage-period">Nov 20 - Dec 20</div>
                  <div className="text-sm text-muted-foreground">Resets in 30 days</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Usage total</h3>
                  <div className="text-base font-semibold" data-testid="text-usage-total">0</div>
                  <div className="text-sm text-muted-foreground">Usage alert: Not set</div>
                  <div className="text-sm text-muted-foreground">Usage budget: Not set</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment method</h3>
                  <div className="text-base" data-testid="text-payment-method">None</div>
                  <button className="text-primary text-sm hover:underline" data-testid="link-add-payment">
                    Add payment
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="heading-resource-usage">
              Resource usage
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Updates take up to 1 hour and may not reflect the latest usage data.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <span className="text-lg">🤖</span> AI
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Usage Total</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Unit Price</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Cost Accrued</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3">Basic Usage</td>
                        <td className="text-right">153 MB</td>
                        <td className="text-right">-</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Replit AI Integrations</td>
                        <td className="text-right">US$0.00</td>
                        <td className="text-right">Variable</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Assistant (Edit requests)</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$0.05 / edit request</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <span className="text-lg">💼</span> Workspace Development
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Quota Used</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Starter Quota</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Usage Total</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Unit Price</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Cost Accrued</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3">Apps</td>
                        <td className="text-right">10</td>
                        <td className="text-right">1</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Collaborators</td>
                        <td className="text-right">1</td>
                        <td className="text-right">0</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Development Time (Minutes)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">6000</td>
                        <td className="text-right">0</td>
                        <td className="text-right">-</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <span className="text-lg">🌐</span> Published Apps
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Quota Used</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Starter Quota</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Usage Total</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Unit Price</th>
                        <th className="text-right py-3 font-medium text-muted-foreground">Cost Accrued</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3">Outbound Data Transfer (GiB)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0.00 GiB</td>
                        <td className="text-right">$0.1 / GiB</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Reserved VM Deployment (Compute hours)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">-</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Autoscale Deployment (Deployments)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$0.033 / day</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Autoscale Deployment (Compute hours)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$3.20 / 1 million</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Autoscale Deployment (Requests)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$1.20 / 1 million</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Scheduled Deployment (Deployments)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$0.033 / day</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Scheduled Deployment (Compute hours)</td>
                        <td className="text-right">0%</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$3.20 / 1 million</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">Static Deployment (Count)</td>
                        <td className="text-right">-</td>
                        <td className="text-right">200</td>
                        <td className="text-right">0</td>
                        <td className="text-right">-</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">PostgreSQL Storage (GiB)</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0.00 GiB</td>
                        <td className="text-right">$1.5 / GiB</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">PostgreSQL Compute (Hours)</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$0.16 / hour</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">App Storage (GiB-months)</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0.00</td>
                        <td className="text-right">$0.03 / GiB / month</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">App Storage Data Transfer (GiB)</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0.00 GiB</td>
                        <td className="text-right">$0.1 / GiB</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">App Storage Basic Operations (Requests)</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$0.0006 / 1K</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3">App Storage Advanced Operations (Requests)</td>
                        <td className="text-right">-</td>
                        <td className="text-right">-</td>
                        <td className="text-right">0</td>
                        <td className="text-right">$0.0075 / 1K</td>
                        <td className="text-right">$0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
