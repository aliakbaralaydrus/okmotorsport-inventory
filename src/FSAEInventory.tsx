/** @jsxImportSource react */
import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Download, Minus, RotateCcw, Trash2 } from "lucide-react";

interface Item {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  unit: string;
  location: string;
  status: string;
}

const FSAEInventory: React.FC<{ scriptUrl: string }> = ({ scriptUrl }) => {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState<"add" | "withdraw" | "return" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: "",
    category: "General",
    quantity: 0,
    minStock: 0,
    unit: "pcs",
    location: "",
    status: "In Stock",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${scriptUrl}?action=getInventory`);
        const data = await res.json();
        setInventory(data);
      } catch (e) {
        console.error(e);
        alert("⚠️ Failed to load data from Google Sheets.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scriptUrl]);

  const updateSheet = async (updated: Item[]) => {
    setInventory(updated);
    await fetch(`${scriptUrl}?action=saveInventory`, {
      method: "POST",
      body: JSON.stringify({ items: updated }),
    });
  };

  const handleAdd = async () => {
    if (!newItem.name) return alert("Please enter an item name.");
    const id = inventory.length ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
    const item = { ...newItem, id } as Item;
    const next = [...inventory, item];
    await updateSheet(next);
    setNewItem({ name: "", category: "General", quantity: 0, minStock: 0, unit: "pcs", location: "" });
    setShowModal(null);
  };

  const handleWithdraw = async () => {
    if (!selectedItem) return;
    if (quantity <= 0) return alert("Invalid quantity.");
    if (quantity > selectedItem.quantity) return alert("Not enough stock!");
    const next = inventory.map(i =>
      i.id === selectedItem.id
        ? { ...i, quantity: i.quantity - quantity, status: getStatus(i.quantity - quantity, i.minStock) }
        : i
    );
    await updateSheet(next);
    setShowModal(null);
  };

  const handleReturn = async () => {
    if (!selectedItem) return;
    if (quantity <= 0) return alert("Invalid quantity.");
    const next = inventory.map(i =>
      i.id === selectedItem.id
        ? { ...i, quantity: i.quantity + quantity, status: getStatus(i.quantity + quantity, i.minStock) }
        : i
    );
    await updateSheet(next);
    setShowModal(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const next = inventory.filter(i => i.id !== id);
    await updateSheet(next);
  };

  const getStatus = (q: number, min: number) => {
    if (q <= 0) return "Out of Stock";
    if (q <= min) return "Low";
    return "In Stock";
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

  const exportCSV = () => {
    if (!inventory.length) return;
    const csv = [
      Object.keys(inventory[0]),
      ...inventory.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`)),
    ]
      .map(r => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">🏎️ OK Motorsport Inventory</h1>

        <div className="flex flex-wrap justify-between gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1 bg-gray-200 px-3 py-2 rounded hover:bg-gray-300">
              <Download size={16} /> Export
            </button>
            <button onClick={() => setShowModal("add")} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-left">Location</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{i.name}</td>
                  <td className="p-2">{i.category}</td>
                  <td className="p-2">{i.quantity}</td>
                  <td className="p-2">{i.unit}</td>
                  <td className="p-2">{i.location}</td>
                  <td
                    className={`p-2 font-semibold ${
                      i.status === "Low"
                        ? "text-yellow-600"
                        : i.status === "Out of Stock"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {i.status}
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(i);
                          setShowModal("withdraw");
                        }}
                        className="p-1 bg-orange-100 rounded hover:bg-orange-200"
                        title="Withdraw"
                      >
                        <Minus size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(i);
                          setShowModal("return");
                        }}
                        className="p-1 bg-green-100 rounded hover:bg-green-200"
                        title="Return"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(i.id)}
                        className="p-1 bg-red-100 rounded hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            {showModal === "add" && (
              <>
                <h2 className="text-lg font-bold mb-2">Add New Item</h2>
                <div className="grid gap-2">
                  <input
                    placeholder="Item name"
                    className="border p-2 rounded"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  />
                  <input
                    placeholder="Category"
                    className="border p-2 rounded"
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  />
                  <input
                    placeholder="Quantity"
                    type="number"
                    className="border p-2 rounded"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  />
                  <input
                    placeholder="Min Stock"
                    type="number"
                    className="border p-2 rounded"
                    value={newItem.minStock}
                    onChange={e => setNewItem({ ...newItem, minStock: Number(e.target.value) })}
                  />
                  <input
                    placeholder="Location"
                    className="border p-2 rounded"
                    value={newItem.location}
                    onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowModal(null)} className="px-3 py-1 border rounded">
                    Cancel
                  </button>
                  <button onClick={handleAdd} className="px-3 py-1 bg-blue-600 text-white rounded">
                    Add
                  </button>
                </div>
              </>
            )}

            {showModal === "withdraw" && selectedItem && (
              <>
                <h2 className="text-lg font-bold mb-2">Withdraw Item</h2>
                <p className="mb-2">{selectedItem.name} — Current: {selectedItem.quantity}</p>
                <input
                  type="number"
                  placeholder="Quantity"
                  className="border p-2 rounded w-full"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowModal(null)} className="px-3 py-1 border rounded">
                    Cancel
                  </button>
                  <button onClick={handleWithdraw} className="px-3 py-1 bg-orange-600 text-white rounded">
                    Withdraw
                  </button>
                </div>
              </>
            )}

            {showModal === "return" && selectedItem && (
              <>
                <h2 className="text-lg font-bold mb-2">Return Item</h2>
                <p className="mb-2">{selectedItem.name} — Current: {selectedItem.quantity}</p>
                <input
                  type="number"
                  placeholder="Quantity"
                  className="border p-2 rounded w-full"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowModal(null)} className="px-3 py-1 border rounded">
                    Cancel
                  </button>
                  <button onClick={handleReturn} className="px-3 py-1 bg-green-600 text-white rounded">
                    Return
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center text-white text-lg">
          Loading...
        </div>
      )}
    </div>
  );
};

export default FSAEInventory;
