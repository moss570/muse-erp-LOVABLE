import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Star, FileText, ChevronDown, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useActiveSQFEdition } from '@/hooks/useSQFEditions';
import { useSQFCodes, useSQFCodesByCategory } from '@/hooks/useSQFCodes';
import type { SQFCode, SQFCodeFilters } from '@/types/sqf';

export default function SQFCodeLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editionParam = searchParams.get('edition');

  const { data: activeEdition } = useActiveSQFEdition();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SQFCodeFilters>({
    is_fundamental: undefined,
    category: undefined,
  });

  const editionId = editionParam || activeEdition?.id;
  const { data: codes } = useSQFCodes(editionId, { ...filters, search });
  const { data: codesByCategory } = useSQFCodesByCategory(editionId);

  const categories = codesByCategory ? Object.keys(codesByCategory).sort() : [];

  const handleFilterChange = (key: keyof SQFCodeFilters, value: any) => {
    setFilters({ ...filters, [key]: value === 'all' ? undefined : value });
  };

  if (!editionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active SQF Edition</h3>
          <p className="text-muted-foreground mb-4">
            Please upload and activate an SQF edition to view codes
          </p>
          <Button onClick={() => navigate('/settings/sqf-editions')}>
            Go to SQF Editions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">SQF Code Library</h1>
        <p className="text-muted-foreground mt-1">
          Browse and search SQF requirements - {activeEdition?.edition_name || 'Loading...'}
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SQF codes, titles, or requirements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger className="w-[250px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.is_fundamental === undefined ? 'all' : filters.is_fundamental ? 'true' : 'false'}
              onValueChange={(value) =>
                handleFilterChange('is_fundamental', value === 'all' ? undefined : value === 'true')
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Codes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Codes</SelectItem>
                <SelectItem value="true">Fundamental Only</SelectItem>
                <SelectItem value="false">Non-Fundamental</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{codes?.length || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Codes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {codes?.filter((c) => c.is_fundamental).length || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Fundamental</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Categories</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {activeEdition?.total_sections || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Sections</div>
          </CardContent>
        </Card>
      </div>

      {/* Codes by Category */}
      {!search && !filters.category && codesByCategory && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Browse by Category</h2>
          {categories.map((category) => (
            <CategoryCollapsible
              key={category}
              category={category}
              codes={codesByCategory[category]}
              onCodeClick={(code) => navigate(`/sqf/codes/${code.id}`)}
            />
          ))}
        </div>
      )}

      {/* Search Results / Filtered Codes */}
      {(search || filters.category) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {search ? `Search Results (${codes?.length || 0})` : `${filters.category} Codes`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!codes || codes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No codes found matching your criteria
              </div>
            ) : (
              <div className="space-y-3">
                {codes.map((code) => (
                  <SQFCodeCard
                    key={code.id}
                    code={code}
                    onClick={() => navigate(`/sqf/codes/${code.id}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryCollapsible({
  category,
  codes,
  onCodeClick,
}: {
  category: string;
  codes: SQFCode[];
  onCodeClick: (code: SQFCode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
                <div className="text-left">
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <CardDescription>{codes.length} requirements</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {codes.some((c) => c.is_fundamental) && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <Star className="h-3 w-3 mr-1 fill-yellow-600" />
                    {codes.filter((c) => c.is_fundamental).length} Fundamental
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {codes.map((code) => (
              <SQFCodeCard key={code.id} code={code} onClick={() => onCodeClick(code)} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function SQFCodeCard({ code, onClick }: { code: SQFCode; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onClick}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs">
                {code.code_number}
              </Badge>
              {code.is_fundamental && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <Star className="h-3 w-3 mr-1 fill-yellow-600" />
                  Fundamental
                </Badge>
              )}
              {code.module && (
                <Badge variant="secondary" className="text-xs">
                  {code.module}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold mb-1">{code.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {code.requirement_text}
            </p>
          </div>
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
