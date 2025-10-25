/** @jsxImportSource react */
import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Download } from "lucide-react";

interface Item {
  id: number;
  name: string;
  category: string;
  subteam: string;
  quantity: number;
  minStock: number;
  unit: string;
  location: string;
  partNumber: string;
  specs?: string;
  status?: string;
}

//interface Transaction {
//  id: number;
//  itemId: number;
//  itemName: string;
//  type: "withdraw" | "return";
//  quantity: number;
//  user: string;
//  date: string;
//  purpose: string;
//  returned?: boolean;
//  returnDate?: string;
// }

const FSAEInventory: React.FC<{ scriptUrl: string }> = ({ scriptUrl }) => {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: "",
    category: "Raw Materials",
    subteam: "Mechanical",
    quantity: 0,
    minStock: 0,
    unit: "pcs",
    location: "",
    partNumber: "",
  });

  // Load data from Google Sheets
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const invRes = await fetch(`${scriptUrl}?action=getInventory`);
        const txRes = await fetch(`${scriptUrl}?action=getTransactions`);
        const invData = await invRes.json();
        const txData = await txRes.json();
        setInventory(invData);
        //setTransactions(txData);
      } catch (e) {
        console.error(e);
        alert("Error loading data from Google Sheets.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scriptUrl]);

  const handleAddItem = async () => {
    const id = inventory.length ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
    const newObj = { ...newItem, id, status: "In Stock" } as Item;
    const next = [...inventory, newObj];
    setInventory(next);

    await fetch(`${scriptUrl}?action=saveInventory`, {
      method: "POST",
      body: JSON.stringify({ items: next }),
    });

    setNewItem({
      name: "",
      category: "Raw Materials",
      subteam: "Mechanical",
      quantity: 0,
      minStock: 0,
      unit: "pcs",
      location: "",
      partNumber: "",
    });
    setShowAddModal(false);
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return inventory;
    return inventory.filter(i =>
      Object.values(i)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  const exportCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0]),
      ...data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`)),
    ]
      .map(e => e.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">
          🏎️ OK Motorsport Inventory
        </h1>
        <div className="flex justify-between mb-4">
          <div className="relative w-1/2">
            <Search
              size={18}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-8 pr-2 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportCSV(inventory, "inventory.csv")}
              className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Subteam</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-medium">{i.name}</td>
                  <td className="p-2">{i.category}</td>
                  <td className="p-2">{i.subteam}</td>
                  <td className="p-2">{i.quantity}</td>
                  <td className="p-2">{i.location}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white p-4 rounded-lg shadow max-w-md w-full">
              <h2 className="text-lg font-semibold mb-2">Add Item</h2>
              <div className="grid gap-2">
                <input
                  placeholder="Item Name"
                  className="border p-2 rounded"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                />
                <input
                  placeholder="Location"
                  className="border p-2 rounded"
                  value={newItem.location}
                  onChange={e =>
                    setNewItem({ ...newItem, location: e.target.value })
                  }
                />
                <input
                  placeholder="Quantity"
                  type="number"
                  className="border p-2 rounded"
                  value={newItem.quantity}
                  onChange={e =>
                    setNewItem({ ...newItem, quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center text-white text-lg">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
};

export default FSAEInventory;
