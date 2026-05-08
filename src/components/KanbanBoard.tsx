import { useState, useEffect } from 'react';
import type { Item } from '../data/types';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import KanbanItemCard from './KanbanItemCard';
import KanbanSheet from './KanbanSheet'; // Import the new component

function KanbanBoard() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewItemSheet, setShowNewItemSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const response = await fetch('https://hb-kanban-backend.hb-user.workers.dev/items');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data: Item[] = await response.json();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      toast("The items have been loaded successfully");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('https://hb-kanban-backend.hb-user.workers.dev/items');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data: Item[] = await response.json();
        if (!cancelled) setItems(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
          toast("The items have been loaded successfully");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const renderItemsByState = (state: Item['state']) => {
    return items
      .filter(item => item.state === state)
      .map(item => (
        <KanbanItemCard key={item.id} item={item} fetchItems={fetchItems} />
      ));
  };

  return (
    <div>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-4"> {/* Flex container for title and button */}
            <h1 className="text-2xl font-bold">Kanban Board</h1>
            <KanbanSheet fetchItems={fetchItems} open={showNewItemSheet} onOpenChange={setShowNewItemSheet} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                className="bg-gray-100 p-4 rounded"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'Open')}
              >
              <h2 className="text-xl font-semibold mb-3">Open</h2>
              {renderItemsByState('Open')}
              </div>
              <div
                className="bg-gray-100 p-4 rounded"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'In Progress')}
              >
              <h2 className="text-xl font-semibold mb-3">In Progress</h2>
              {renderItemsByState('In Progress')}
              </div>
              <div
                className="bg-gray-100 p-4 rounded"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'In Validation')}
              >
              <h2 className="text-xl font-semibold mb-3">In Validation</h2>
              {renderItemsByState('In Validation')}
              </div>
              <div
                className="bg-gray-100 p-4 rounded"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'Done')}
              >
              <h2 className="text-xl font-semibold mb-3">Done</h2>
              {renderItemsByState('Done')}
              </div>
          </div>
        </div>
        <Toaster />
    </div>
  );

  async function handleDrop(e: React.DragEvent, newState: Item['state']) {
    const itemId = e.dataTransfer.getData('itemId');
    if (!itemId) return;

    const itemToMove = items.find(item => item.id === parseInt(itemId, 10));
    if (!itemToMove || itemToMove.state === newState) return;

    const originalState = itemToMove.state;

    // Optimistically update state
    setItems(items.map(item =>
      item.id === parseInt(itemId, 10) ? { ...item, state: newState } : item
    ));

    try {
      const response = await fetch(`https://hb-kanban-backend.hb-user.workers.dev/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...itemToMove, state: newState }),
      });

      if (!response.ok) {
        throw new Error(`Error updating item state: ${response.status}`);
      }

      toast.success(`Item ${itemId} moved to ${newState}`);
      fetchItems(); // Reload items to ensure consistency

    } catch (error: unknown) {
      console.error('Error updating item state:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to move item ${itemId}: ${message}`);
      // Revert state on error
      setItems(items.map(item =>
        item.id === parseInt(itemId, 10) ? { ...item, state: originalState } : item
      ));
    }
  }
}

export default KanbanBoard;
