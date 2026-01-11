import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { SettingsBreadcrumb } from "@/components/settings/SettingsBreadcrumb";
import { Link2, RefreshCw, CheckCircle2, AlertCircle, Info, Building2 } from "lucide-react";
import { useXeroConnection, useXeroConnect, useXeroDisconnect, useFetchXeroAccounts, useXeroAccounts } from "@/hooks/useXero";
import { useXeroAccountMappings, useUpdateAccountMapping } from "@/hooks/useXeroManufacturing";

interface AccountOption {
  xero_account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  xero_type: string;
  xero_class: string;
}

const MAPPING_LABELS: Record<string, { label: string; filterTypes: string[] }> = {
  applied_labor: {
    label: "Applied Labor Account",
    filterTypes: ["DIRECTCOSTS", "EXPENSE"],
  },
  applied_overhead: {
    label: "Applied Overhead Account",
    filterTypes: ["EXPENSE", "DIRECTCOSTS"],
  },
  wip_inventory: {
    label: "WIP Inventory Account",
    filterTypes: ["CURRENT", "ASSET"],
  },
  raw_material_inventory: {
    label: "Raw Material Inventory Account",
    filterTypes: ["CURRENT", "ASSET"],
  },
  finished_goods_inventory: {
    label: "Finished Goods Inventory Account",
    filterTypes: ["CURRENT", "ASSET"],
  },
};

export default function XeroConfiguration() {
  const { data: connection, isLoading: connectionLoading } = useXeroConnection();
  const { connectToXero } = useXeroConnect();
  const { mutate: disconnect, isPending: disconnecting } = useXeroDisconnect();
  const { mutate: fetchAccounts, isPending: fetchingAccounts } = useFetchXeroAccounts();
  const { data: accountsData } = useXeroAccounts();
  const { data: mappings, isLoading: mappingsLoading } = useXeroAccountMappings();
  const { mutate: updateMapping, isPending: updatingMapping } = useUpdateAccountMapping();

  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

  // Initialize selected accounts from mappings
  useEffect(() => {
    if (mappings) {
      const initial: Record<string, string> = {};
      mappings.forEach((m) => {
        if (m.xero_account_id) {
          initial[m.mapping_key] = m.xero_account_id;
        }
      });
      setSelectedAccounts(initial);
    }
  }, [mappings]);

  const handleAccountSelect = (mappingKey: string, xeroAccountId: string) => {
    const account = accountsData?.accounts?.find((a) => a.xero_account_id === xeroAccountId);
    if (!account) return;

    setSelectedAccounts((prev) => ({ ...prev, [mappingKey]: xeroAccountId }));

    updateMapping({
      mappingKey,
      xeroAccountId: account.xero_account_id,
      xeroAccountCode: account.account_code,
      xeroAccountName: account.account_name,
      xeroAccountType: account.xero_type,
    });
  };

  const filterAccounts = (filterTypes: string[]): AccountOption[] => {
    if (!accountsData?.accounts) return [];
    return accountsData.accounts.filter((acc) =>
      filterTypes.some(
        (type) =>
          acc.xero_type?.toUpperCase().includes(type) ||
          acc.xero_class?.toUpperCase().includes(type) ||
          acc.account_type?.toUpperCase().includes(type)
      )
    );
  };

  const getMappingHelperText = (mappingKey: string): string => {
    const mapping = mappings?.find((m) => m.mapping_key === mappingKey);
    return mapping?.helper_text || "";
  };

  const isConnected = !!connection;

  return (
    <AppLayout>
      <div className="space-y-6">
        <SettingsBreadcrumb currentPage="Xero Configuration" />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Xero Configuration</h1>
            <p className="text-muted-foreground">
              Connect to Xero and map accounts for manufacturing transactions
            </p>
          </div>
        </div>

        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Xero Connection
            </CardTitle>
            <CardDescription>
              Connect your Xero organization to sync accounting data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking connection...
              </div>
            ) : isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Connected to Xero</p>
                      <p className="text-sm text-muted-foreground">
                        Organization: {connection.tenant_name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchAccounts()}
                    disabled={fetchingAccounts}
                  >
                    {fetchingAccounts ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh Accounts
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => disconnect()}
                    disabled={disconnecting}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <AlertCircle className="h-5 w-5" />
                  <p>Not connected to Xero</p>
                </div>
                <Button onClick={connectToXero}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect to Xero
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Mappings */}
        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Manufacturing Account Mappings
              </CardTitle>
              <CardDescription>
                Map your Xero accounts to enable manufacturing journal entries. These mappings are
                used when syncing production runs to Xero via Manual Journals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!accountsData?.accounts?.length ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click "Refresh Accounts" above to load your Xero chart of accounts, then
                    configure the mappings below.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="bg-muted/50">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>How Manufacturing Journals Work:</strong> When you close a production
                      day, we create a Manual Journal in Xero that moves costs from Raw Materials
                      to WIP Inventory, and offsets Labor/Overhead expenses. This creates the
                      proper "contra-expense" effect even though Xero only has Expense account
                      types.
                    </AlertDescription>
                  </Alert>

                  <Separator />

                  {mappingsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading mappings...
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(MAPPING_LABELS).map(([key, config]) => {
                        const filteredAccounts = filterAccounts(config.filterTypes);
                        const helperText = getMappingHelperText(key);
                        const currentMapping = mappings?.find((m) => m.mapping_key === key);

                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key} className="text-base font-medium">
                              {config.label}
                            </Label>
                            <Select
                              value={selectedAccounts[key] || ""}
                              onValueChange={(value) => handleAccountSelect(key, value)}
                              disabled={updatingMapping}
                            >
                              <SelectTrigger id={key}>
                                <SelectValue placeholder="Select an account...">
                                  {currentMapping?.xero_account_code && currentMapping?.xero_account_name
                                    ? `${currentMapping.xero_account_code} - ${currentMapping.xero_account_name}`
                                    : "Select an account..."}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {filteredAccounts.map((account) => (
                                  <SelectItem
                                    key={account.xero_account_id}
                                    value={account.xero_account_id}
                                  >
                                    {account.account_code} - {account.account_name}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({account.xero_type})
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {helperText && (
                              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                {helperText}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
