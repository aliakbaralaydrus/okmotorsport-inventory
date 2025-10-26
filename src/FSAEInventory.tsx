/** @jsxImportSource react */
import React, { useEffect, useMemo, useState } from "react";
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

type ModalType = "add" | "withdraw" | "return" | null;

const TEAM_YELLOW = "rgb(250 204 21)"; // Tailwind yellow-400 equivalent

const FSAEInventory: React.FC<{ scriptUrl: string }> = ({ scriptUrl }) => {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: "",
    category: "General",
    quantity: 0,
    minStock: 0,
    unit: "pcs",
    location: "",
    status: "In Stock",
  });

  // Sample fallback data if scriptUrl not provided or load fails
  const SAMPLE: Item[] = [
    { id: 1, name: "M10 Bolt", category: "Hardware", quantity: 50, minStock: 5, unit: "pcs", location: "Box A1", status: "In Stock" },
    { id: 2, name: "Brake Pad", category: "Brakes", quantity: 4, minStock: 5, unit: "set", location: "Shelf B2", status: "Low" },
  ];

  useEffect(() => {
    const load = async () => {
      if (!scriptUrl) {
        setInventory(SAMPLE);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${scriptUrl}?action=getInventory`);
        const data = await res.json();
        // Ensure numeric fields are numbers
        const normalized: Item[] = (Array.isArray(data) ? data : []).map((r: any, i: number) => ({
          id: Number(r.ID ?? r.id ?? i + 1),
          name: String(r.Name ?? r.name ?? ""),
          category: String(r.Category ?? r.category ?? "General"),
          quantity: Number(r.Quantity ?? r.quantity ?? 0),
          minStock: Number(r.MinStock ?? r.minStock ?? 0),
          unit: String(r.Unit ?? r.unit ?? "pcs"),
          location: String(r.Location ?? r.location ?? ""),
          status: String(r.Status ?? r.status ?? (() => {
            const q = Number(r.Quantity ?? r.quantity ?? 0);
            const m = Number(r.MinStock ?? r.minStock ?? 0);
            return q <= 0 ? "Out of Stock" : q <= m ? "Low" : "In Stock";
          })()),
        }));
        setInventory(normalized);
      } catch (err) {
        console.error("Load error:", err);
        alert("⚠️ Failed to load data from Google Sheets. Using sample data.");
        setInventory(SAMPLE);
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl]);

  const saveToSheet = async (items: Item[]) => {
    setInventory(items);
    if (!scriptUrl) return;
    try {
      await fetch(`${scriptUrl}?action=saveInventory`, {
        method: "POST",
        body: JSON.stringify({ items }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Save error:", err);
      alert("⚠️ Failed to save to Google Sheets. Changes are in-memory only.");
    }
  };

  const getStatus = (q: number, min: number) => {
    if (q <= 0) return "Out of Stock";
    if (q <= min) return "Low";
    return "In Stock";
  };

  const handleAdd = async () => {
    if (!newItem.name || newItem.name.trim() === "") return alert("Please enter an item name.");
    const id = inventory.length ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
    const item: Item = {
      id,
      name: String(newItem.name),
      category: String(newItem.category ?? "General"),
      quantity: Number(newItem.quantity ?? 0),
      minStock: Number(newItem.minStock ?? 0),
      unit: String(newItem.unit ?? "pcs"),
      location: String(newItem.location ?? ""),
      status: getStatus(Number(newItem.quantity ?? 0), Number(newItem.minStock ?? 0)),
    };
    const next = [...inventory, item];
    await saveToSheet(next);
    setNewItem({ name: "", category: "General", quantity: 0, minStock: 0, unit: "pcs", location: "" });
    setModalType(null);
  };

  const handleWithdraw = async () => {
    if (!selectedItem) return;
    if (quantity <= 0) return alert("Invalid quantity.");
    if (quantity > selectedItem.quantity) return alert("Not enough stock.");
    const next = inventory.map(i =>
      i.id === selectedItem.id ? { ...i, quantity: i.quantity - quantity, status: getStatus(i.quantity - quantity, i.minStock) } : i
    );
    await saveToSheet(next);
    setModalType(null);
    setQuantity(0);
  };

  const handleReturn = async () => {
    if (!selectedItem) return;
    if (quantity <= 0) return alert("Invalid quantity.");
    const next = inventory.map(i =>
      i.id === selectedItem.id ? { ...i, quantity: i.quantity + quantity, status: getStatus(i.quantity + quantity, i.minStock) } : i
    );
    await saveToSheet(next);
    setModalType(null);
    setQuantity(0);
  };

  const handleDelete = async (id: number) => {
    // more explicit confirmation
    if (!confirm("🛑 Delete item? This will remove it permanently from the inventory.")) return;
    const next = inventory.filter(i => i.id !== id);
    await saveToSheet(next);
  };

  const exportCSV = () => {
    if (!inventory.length) return alert("No items to export.");
    const keys = ["id", "name", "category", "quantity", "minStock", "unit", "location", "status"];
    const rows = inventory.map(i => keys.map(k => `"${String((i as any)[k] ?? "")}".replace(/"/g, '""')`));
    const csv = [keys.join(","), ...inventory.map(i => keys.map(k => `"${String((i as any)[k] ?? "")}".replace(/"/g, '""')`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory.csv";
    a.click();
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return inventory;
    const s = searchTerm.toLowerCase();
    return inventory.filter(i =>
      [i.name, i.category, String(i.quantity), i.unit, i.location, i.status].join(" ").toLowerCase().includes(s)
    );
  }, [inventory, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/ubco-logo.png" alt="UBCO Motorsports" className="w-12 h-12 object-contain rounded-md shadow" />
            <div>
              <div style={{ color: TEAM_YELLOW }} className="text-sm font-semibold">UBCO</div>
              <div className="text-lg font-bold">UBCO Motorsports Inventory</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded px-2 py-1">
              <Search size={16} className="text-white/70" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search items, category, location..."
                className="bg-transparent placeholder-white/60 outline-none text-white text-sm w-72"
              />
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-white text-black rounded px-3 py-2 hover:opacity-90"
              title="Export CSV"
            >
              <Download size={16} /> Export
            </button>

            <button
              onClick={() => setModalType("add")}
              className="flex items-center gap-2 bg-yellow-400 text-black rounded px-3 py-2 hover:brightness-95"
              title="Add item"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Qty</th>
                  <th className="p-3 text-left">Unit</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3">{i.category}</td>
                    <td className="p-3">{i.quantity}</td>
                    <td className="p-3">{i.unit}</td>
                    <td className="p-3">{i.location}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-semibold text-sm`}
                        style={{
                          background:
                            i.status === "Out of Stock"
                              ? "rgba(239,68,68,0.08)"
                              : i.status === "Low"
                              ? "rgba(245,158,11,0.08)"
                              : "rgba(34,197,94,0.06)",
                          color: i.status === "Out of Stock" ? "#ef4444" : i.status === "Low" ? "#f59e0b" : "#16a34a",
                        }}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(i);
                            setModalType("withdraw");
                          }}
                          title="Withdraw"
                          className="p-2 bg-orange-50 rounded hover:bg-orange-100"
                        >
                          <Minus size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(i);
                            setModalType("return");
                          }}
                          title="Return"
                          className="p-2 bg-green-50 rounded hover:bg-green-100"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
                          title="Delete"
                          className="p-2 bg-red-50 rounded hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-5">
            {modalType === "add" && (
              <>
                <h3 className="text-lg font-bold mb-2">Add New Item</h3>
                <div className="grid gap-2">
                  <input
                    className="border p-2 rounded"
                    placeholder="Item name"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  />
                  <input
                    className="border p-2 rounded"
                    placeholder="Category"
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="border p-2 rounded"
                      placeholder="Quantity"
                      type="number"
                      value={newItem.quantity ?? 0}
                      onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    />
                    <input
                      className="border p-2 rounded"
                      placeholder="Min stock"
                      type="number"
                      value={newItem.minStock ?? 0}
                      onChange={e => setNewItem({ ...newItem, minStock: Number(e.target.value) })}
                    />
                  </div>
                  <input
                    className="border p-2 rounded"
                    placeholder="Unit (e.g. pcs)"
                    value={newItem.unit}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                  <input
                    className="border p-2 rounded"
                    placeholder="Location"
                    value={newItem.location}
                    onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setModalType(null)} className="px-3 py-1 border rounded">Cancel</button>
                  <button onClick={handleAdd} className="px-3 py-1 bg-yellow-400 rounded">Add</button>
                </div>
              </>
            )}

            {modalType === "withdraw" && selectedItem && (
              <>
                <h3 className="text-lg font-bold mb-2">Withdraw</h3>
                <p className="text-sm text-gray-600 mb-2">{selectedItem.name} — Current: {selectedItem.quantity}</p>
                <input
                  className="border p-2 rounded w-full"
                  type="number"
                  placeholder="Quantity to withdraw"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setModalType(null)} className="px-3 py-1 border rounded">Cancel</button>
                  <button onClick={handleWithdraw} className="px-3 py-1 bg-orange-500 text-white rounded">Withdraw</button>
                </div>
              </>
            )}

            {modalType === "return" && selectedItem && (
              <>
                <h3 className="text-lg font-bold mb-2">Return</h3>
                <p className="text-sm text-gray-600 mb-2">{selectedItem.name} — Current: {selectedItem.quantity}</p>
                <input
                  className="border p-2 rounded w-full"
                  type="number"
                  placeholder="Quantity to return"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setModalType(null)} className="px-3 py-1 border rounded">Cancel</button>
                  <button onClick={handleReturn} className="px-3 py-1 bg-green-600 text-white rounded">Return</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="rounded-full p-6" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="text-white">Loading...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FSAEInventory;
