import { useRef } from 'react';
import EquipmentGrid from './EquipmentGrid';
import { useEquipmentQuery } from '../../hooks/useEquipmentQuery';
import { useEquipmentImport } from '../../hooks/useEquipmentImport';
import { Text, Button } from '../../ui';

interface Props {
  discordId: string;
  characterName: string;
  isOwner: boolean;
}

export default function EquipmentPanel({ discordId, characterName, isOwner }: Props) {
  const { data: items, isLoading } = useEquipmentQuery(discordId, characterName);
  const importMutation = useEquipmentImport(discordId, characterName);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      importMutation.mutate(content);
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {isOwner && (
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            intent="ghost"
            pending={importMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {importMutation.isPending ? 'Importing...' : 'Upload Inventory'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          {importMutation.isError && (
            <Text variant="error">
              {importMutation.error instanceof Error ? importMutation.error.message : 'Import failed'}
            </Text>
          )}
          {importMutation.isSuccess && (
            <Text variant="caption" className="text-green">Imported</Text>
          )}
        </div>
      )}

      {isLoading && <Text variant="caption" className="py-2 text-center">Loading equipment...</Text>}

      {!isLoading && items && items.length > 0 && (
        <EquipmentGrid items={items} />
      )}

      {!isLoading && (!items || items.length === 0) && !isOwner && (
        <Text variant="caption" className="py-2 text-center">No equipment data</Text>
      )}

      {!isLoading && (!items || items.length === 0) && isOwner && (
        <Text variant="caption" className="py-2 text-center">
          Use /outputfile inventory in-game, then upload the file
        </Text>
      )}
    </div>
  );
}
