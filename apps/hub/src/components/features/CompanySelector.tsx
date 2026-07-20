import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hubilee/ui";
import { useCompanies } from "@/hooks/useCompanies";
import { authApi } from "@/lib/api-client";
import { Building2 } from "lucide-react";

type CompanySelectorProps = {
  currentCompanyId?: string;
  isSuperuser?: boolean;
};

export function CompanySelector({ currentCompanyId, isSuperuser }: CompanySelectorProps) {
  const queryClient = useQueryClient();
  const [isChanging, setIsChanging] = useState(false);
  
  // Only fetch companies if superuser or no current company
  const { data: companies, isLoading } = useCompanies(
    isSuperuser || !currentCompanyId
  );

  const handleCompanyChange = async (companyId: string) => {
    if (companyId === currentCompanyId) return;
    
    setIsChanging(true);
    try {
      const response = await authApi.context(companyId);
      if (response.success && response.data) {
        // Invalidate all queries to refetch with new company context
        await queryClient.invalidateQueries();
      }
    } catch (error) {
      console.error("Error changing company:", error);
    } finally {
      setIsChanging(false);
    }
  };

  if (isLoading || !companies || companies.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Building2 className="h-4 w-4 text-slate-500" />
      <Select
        value={currentCompanyId}
        onValueChange={handleCompanyChange}
        disabled={isChanging}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar empresa" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
