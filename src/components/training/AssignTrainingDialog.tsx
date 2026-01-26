import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, Calendar, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBulkAssignTraining } from "@/hooks/usePolicyTraining";
import { format, addDays } from "date-fns";

interface AssignTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  policyTitle: string;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  department?: { name: string } | null;
}

export function AssignTrainingDialog({
  open,
  onOpenChange,
  policyId,
  policyTitle,
  onSuccess,
}: AssignTrainingDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [dueDays, setDueDays] = useState("30");
  
  const bulkAssign = useBulkAssignTraining();

  // Fetch active employees
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["employees-for-training"],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await (supabase
        .from("employees") as any)
        .select("id, first_name, last_name, employee_number, department:departments(name)")
        .eq("status", "active")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: open,
  });

  // Fetch employees who already have this training assigned
  const { data: existingAssignments } = useQuery<Set<string>>({
    queryKey: ["existing-training-assignments", policyId],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await (supabase
        .from("employee_policy_training") as any)
        .select("employee_id")
        .eq("policy_id", policyId);
      if (error) throw error;
      return new Set((data || []).map((d: { employee_id: string }) => d.employee_id));
    },
    enabled: open && !!policyId,
  });

  // Filter employees based on search
  const filteredEmployees = employees?.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      emp.employee_number.toLowerCase().includes(searchLower) ||
      emp.department?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Available employees (not already assigned)
  const availableEmployees = filteredEmployees?.filter(
    emp => !existingAssignments?.has(emp.id)
  );

  const toggleEmployee = (employeeId: string) => {
    const newSelection = new Set(selectedEmployees);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    setSelectedEmployees(newSelection);
  };

  const toggleAll = () => {
    if (selectedEmployees.size === availableEmployees?.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(availableEmployees?.map(e => e.id) || []));
    }
  };

  const handleSubmit = async () => {
    if (selectedEmployees.size === 0) return;

    const dueDate = format(addDays(new Date(), parseInt(dueDays, 10)), "yyyy-MM-dd");
    
    await bulkAssign.mutateAsync({
      policyId,
      employeeIds: Array.from(selectedEmployees),
      dueDate,
    });

    onOpenChange(false);
    setSelectedEmployees(new Set());
    onSuccess?.();
  };

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedEmployees(new Set());
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Training
          </DialogTitle>
          <DialogDescription>
            Assign "{policyTitle}" training to employees
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Search and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Search Employees</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, ID, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due In (days)
              </Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
              />
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedEmployees.size === availableEmployees?.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedEmployees.size} selected
              </span>
            </div>
            <Badge variant="outline">
              {existingAssignments?.size || 0} already assigned
            </Badge>
          </div>

          {/* Employee List */}
          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : availableEmployees?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <CheckCircle className="h-8 w-8 mb-2 text-success" />
                <p>All employees are already assigned</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableEmployees?.map((employee) => (
                  <div
                    key={employee.id}
                    className={`
                      flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                      ${selectedEmployees.has(employee.id) 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-muted"}
                    `}
                    onClick={() => toggleEmployee(employee.id)}
                  >
                    <Checkbox
                      checked={selectedEmployees.has(employee.id)}
                      onCheckedChange={() => toggleEmployee(employee.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {employee.first_name[0]}{employee.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{employee.employee_number}</span>
                        {employee.department?.name && (
                          <>
                            <span>•</span>
                            <span>{employee.department.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedEmployees.size === 0 || bulkAssign.isPending}
          >
            {bulkAssign.isPending 
              ? "Assigning..." 
              : `Assign to ${selectedEmployees.size} Employee${selectedEmployees.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignTrainingDialog;
