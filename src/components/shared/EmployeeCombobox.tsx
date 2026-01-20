import { useState } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface EmployeeComboboxProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

const EmployeeCombobox = ({ 
  value, 
  onChange, 
  placeholder = 'Select employee...', 
  disabled = false 
}: EmployeeComboboxProps) => {
  const [open, setOpen] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-combobox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data as Employee[];
    },
  });

  const getFullName = (emp: Employee) => 
    [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email || 'Unknown';

  const selectedEmployee = employees?.find(emp => emp.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedEmployee ? (
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {getFullName(selectedEmployee)}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading...' : 'No employees found.'}
            </CommandEmpty>
            <CommandGroup>
              {employees?.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={getFullName(emp)}
                  onSelect={() => {
                    onChange(emp.id === value ? undefined : emp.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === emp.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{getFullName(emp)}</span>
                    {emp.email && (
                      <span className="text-xs text-muted-foreground">{emp.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EmployeeCombobox;
