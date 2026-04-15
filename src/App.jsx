import { useState, useEffect } from "react";

const STORAGE_KEY = "logbook_trips";

export default function App() {
  const [trips, setTrips] = useState([]);
  const [tripForm, setTripForm] = useState({
    date: "",
    description: "",
    odomStart: "",
    odomEnd: "",
    type: "business",
    notes: ""
  });

  const [descWarn, setDescWarn] = useState(false);

  // 🔥 Load saved trips
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setTrips(JSON.parse(saved));
    }
  }, []);

  // 🔥 Save trips automatically
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }, [trips]);

  // 🔥 Auto-fill start ODO from last trip
  useEffect(() => {
    if (trips.length > 0) {
      const lastTrip = trips[trips.length - 1];
      setTripForm((prev) => ({
        ...prev,
        odomStart: lastTrip.odomEnd || ""
      }));
    }
  }, [trips]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTripForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const saveTrip = () => {
    if (!tripForm.odomStart || !tripForm.odomEnd) return;

    if (!tripForm.description) {
      setDescWarn(true);
    } else {
      setDescWarn(false);
    }

    const newTrip = {
      ...tripForm,
      id: Date.now()
    };

    setTrips((prev) => [...prev, newTrip]);

    setTripForm((prev) => ({
      ...prev,
      description: "",
      odomStart: prev.odomEnd,
      odomEnd: "",
      notes: ""
    }));
  };

  const exportCSV = () => {
    const headers = [
      "Date",
      "Description",
      "Odo Start",
      "Odo End",
      "Distance (km)",
      "Type",
      "Notes"
    ];

    const rows = trips.map((t) => {
      const km =
        Number(t.odomEnd || 0) - Number(t.odomStart || 0);

      return [
        t.date,
        t.description,
        t.odomStart,
        t.odomEnd,
        km,
        t.type,
        t.notes || ""
      ];
    });

    const csv =
      [headers, ...rows]
        .map((row) =>
          row.map((v) => `"${v}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logbook.csv";
    link.click();
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      <h1>Logbook Pro SA (Beta)</h1>

      <h2>Add Trip</h2>

      <input
        type="date"
        name="date"
        value={tripForm.date}
        onChange={handleChange}
      />

      <input
        placeholder="Purpose / Description"
        name="description"
        value={tripForm.description}
        onChange={handleChange}
      />

      {descWarn && (
        <p style={{ color: "orange" }}>
          Description recommended for SARS compliance
        </p>
      )}

      <input
        placeholder="Odometer Start"
        name="odomStart"
        value={tripForm.odomStart}
        onChange={handleChange}
      />

      <input
        placeholder="Odometer End"
        name="odomEnd"
        value={tripForm.odomEnd}
        onChange={handleChange}
      />

      <select
        name="type"
        value={tripForm.type}
        onChange={handleChange}
      >
        <option value="business">Business</option>
        <option value="private">Private</option>
      </select>

      <input
        placeholder="Notes (optional)"
        name="notes"
        value={tripForm.notes}
        onChange={handleChange}
      />

      <button onClick={saveTrip}>
        ➕ Add Trip
      </button>

      <h2>Trips</h2>

      <button onClick={exportCSV}>
        ⬇️ Export to Excel (CSV)
      </button>

      <table border="1" cellPadding="5" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Odo Start</th>
            <th>Odo End</th>
            <th>KM</th>
            <th>Type</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((t) => {
            const km =
              Number(t.odomEnd || 0) -
              Number(t.odomStart || 0);

            return (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.description}</td>
                <td>{t.odomStart}</td>
                <td>{t.odomEnd}</td>
                <td>{km}</td>
                <td>
                  {t.type === "business" ? "🔵 Business" : "🔴 Private"}
                </td>
                <td>{t.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
