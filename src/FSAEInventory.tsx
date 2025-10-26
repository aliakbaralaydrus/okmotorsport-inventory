/** @jsxImportSource react */
import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Minus,
  RotateCcw,
  Trash2,
  Check,
  X,
} from "lucide-react";

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
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: "",
    category: "General",
    quantity: 0,
    minStock: 0,
    unit: "pcs",
    location: "",
    status: "In Stock",
  });

  // ---- LOAD INVENTORY ----
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${scriptUrl}?action=getInventory`);
        const data = await res.json();
        setInventory(data);
      } catch {
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

  const getStatus = (q: number, min: number) => {
    if (q <= 0) return "Out of Stock";
    if (q <= min) return "Low";
    return "In Stock";
  };

  // ---- ACTIONS ----
  const handleAdd = async () => {
    if (!newItem.name) return alert("Please enter an item name.");
    const id = inventory.length ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
    const item = { ...newItem, id } as Item;
    const next = [...inventory, item];
    await updateSheet(next);
    setNewItem({
      name: "",
      category: "General",
      quantity: 0,
      minStock: 0,
      unit: "pcs",
      location: "",
    });
    setShowModal(null);
  };

  const handleWithdraw = async () => {
    if (!selectedItem || quantity <= 0) return alert("Invalid quantity.");
    if (quantity > selectedItem.quantity) return alert("Not enough stock!");
    const next = inventory.map(i =>
      i.id === selectedItem.id
        ? {
            ...i,
            quantity: i.quantity - quantity,
            status: getStatus(i.quantity - quantity, i.minStock),
          }
        : i
    );
    await updateSheet(next);
    setShowModal(null);
  };

  const handleReturn = async () => {
    if (!selectedItem || quantity <= 0) return alert("Invalid quantity.");
    const next = inventory.map(i =>
      i.id === selectedItem.id
        ? {
            ...i,
            quantity: i.quantity + quantity,
            status: getStatus(i.quantity + quantity, i.minStock),
          }
        : i
    );
    await updateSheet(next);
    setShowModal(null);
  };

  const handleDelete = async (id: number) => {
    const next = inventory.filter(i => i.id !== id);
    await updateSheet(next);
    setConfirmDelete(null);
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

  // ---- UI ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-between px-6 py-3 border-b border-yellow-500 shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src="/ubco-logo.png"
            alt="UBCO Motorsports Logo"
            className="h-10 w-auto rounded-md"
          />
          <h1 className="text-xl md:text-2xl font-bold text-yellow-400">
            UBCO Motorsports | Inventory System
          </h1>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-1 rounded transition"
        >
          <Download size={16} /> Export
        </button>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 focus:ring-2 focus:ring-yellow-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal("add")}
            className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-2 rounded transition"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg shadow-xl border border-gray-700 bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
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
                <tr
                  key={i.id}
                  className="border-t border-gray-700 hover:bg-gray-800 transition"
                >
                  <td className="p-2 font-medium">{i.name}</td>
                  <td className="p-2">{i.category}</td>
                  <td className="p-2">{i.quantity}</td>
                  <td className="p-2">{i.unit}</td>
                  <td className="p-2">{i.location}</td>
                  <td
                    className={`p-2 font-semibold ${
                      i.status === "Low"
                        ? "text-yellow-400"
                        : i.status === "Out of Stock"
                        ? "text-red-500"
                        : "text-green-400"
                    }`}
                  >
                    {i.status}
                  </td>
                  <td className="p-2 text-center relative">
                    {confirmDelete === i.id ? (
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-600 rounded-md px-2 py-1 flex gap-2 shadow-lg">
                        <button
                          onClick={() => handleDelete(i.id)}
                          className="text-green-400 hover:text-green-300"
                          title="Confirm"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-red-400 hover:text-red-300"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(i);
                            setShowModal("withdraw");
                          }}
                          className="p-1 bg-orange-100/20 text-orange-400 rounded hover:bg-orange-200/30"
                          title="Withdraw"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(i);
                            setShowModal("return");
                          }}
                          className="p-1 bg-green-100/20 text-green-400 rounded hover:bg-green-200/30"
                          title="Return"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(i.id)}
                          className="p-1 bg-red-100/20 text-red-400 rounded hover:bg-red-200/30"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-400">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODALS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-md border border-yellow-500">
            {showModal === "add" && (
              <>
                <h2 className="text-lg font-bold mb-3 text-yellow-400">
                  Add New Item
                </h2>
                <div className="grid gap-2">
                  <input
                    placeholder="Item name"
                    className="border border-gray-700 bg-gray-800 p-2 rounded text-gray-100"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  />
                  <input
                    placeholder="Category"
                    className="border border-gray-700 bg-gray-800 p-2 rounded text-gray-100"
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  />
                  <input
                    placeholder="Quantity"
                    type="number"
                    className="border border-gray-700 bg-gray-800 p-2 rounded text-gray-100"
                    value={newItem.quantity}
                    onChange={e =>
                      setNewItem({ ...newItem, quantity: Number(e.target.value) })
                    }
                  />
                  <input
                    placeholder="Min Stock"
                    type="number"
                    className="border border-gray-700 bg-gray-800 p-2 rounded text-gray-100"
                    value={newItem.minStock}
                    onChange={e =>
                      setNewItem({ ...newItem, minStock: Number(e.target.value) })
                    }
                  />
                  <input
                    placeholder="Location"
                    className="border border-gray-700 bg-gray-800 p-2 rounded text-gray-100"
                    value={newItem.location}
                    onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowModal(null)}
                    className="px-3 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    className="px-3 py-1 bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-400"
                  >
                    Add
                  </button>
                </div>
              </>
            )}

            {showModal === "withdraw" && selectedItem && (
              <>
                <h2 className="text-lg font-bold mb-2 text-yellow-400">
                  Withdraw Item
                </h2>
                <p className="mb-2 text-gray-300">
                  {selectedItem.name} — Current: {selectedItem.quantity}
                </p>
                <input
                  type="number"
                  placeholder="Quantity"
                  className="border border-gray-700 bg-gray-800 p-2 rounded w-full text-gray-100"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowModal(null)}
                    className="px-3 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    className="px-3 py-1 bg-orange-500 text-white rounded font-semibold hover:bg-orange-400"
                  >
                    Withdraw
                  </button>
                </div>
              </>
            )}

            {showModal === "return" && selectedItem && (
              <>
                <h2 className="text-lg font-bold mb-2 text-yellow-400">
                  Return Item
                </h2>
                <p className="mb-2 text-gray-300">
                  {selectedItem.name} — Current: {selectedItem.quantity}
                </p>
                <input
                  type="number"
                  placeholder="Quantity"
                  className="border border-gray-700 bg-gray-800 p-2 rounded w-full text-gray-100"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowModal(null)}
                    className="px-3 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturn}
                    className="px-3 py-1 bg-green-600 text-white rounded font-semibold hover:bg-green-500"
                  >
                    Return
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center text-yellow-400 text-lg">
          Loading...
        </div>
      )}
    </div>
  );
};

export default FSAEInventory;
