import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminHub = () => {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState('');
  const [activeLabs, setActiveLabs] = useState([]);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = async () => {
    try {
      const prodRes = await axios.get('/api/products/');
      setProducts(prodRes.data);
      const labsRes = await axios.get('/api/labs/active/');
      setActiveLabs(labsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', name);
    data.append('price', price);
    data.append('category', category);
    data.append('description', description);
    if (image) data.append('image', image);

    try {
      await axios.post('/api/admin/products/', data, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setMsg('Product added successfully!');
      setName(''); setPrice(''); setImage(null);
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add product');
    }
  };

  const handlePriceUpdate = async (id, newPrice) => {
    try {
      await axios.patch(`/api/admin/products/${id}/price/`, { price: newPrice }, { headers });
      setMsg('Price updated!');
      loadData();
    } catch (err) {
      setMsg('Price update failed: ' + (err.response?.data?.error || 'Unauthorized'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/admin/products/${id}/`, { headers });
      setMsg('Product deleted!');
      loadData();
    } catch (err) {
      setMsg('Delete failed: ' + (err.response?.data?.error || 'Unauthorized'));
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>PortSwigger Lab Admin & Product Hub</h1>

      {/* Active Lab Session Alert Banner */}
      <div style={{ padding: 15, background: '#eef2ff', borderRadius: 8, marginBottom: 20 }}>
        <h3>Currently Enabled Labs:</h3>
        {activeLabs.length === 0 ? (
          <p><em>No vulnerabilities active. System is running in SECURE mode. Activate a lab in Django Admin.</em></p>
        ) : (
          activeLabs.map(lab => (
            <div key={lab.code} style={{ background: '#fff', padding: 10, margin: '5px 0', borderLeft: '4px solid #ef4444' }}>
              <strong>[{lab.category}] {lab.code}:</strong> {lab.title}
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#555' }}>{lab.description}</p>
            </div>
          ))
        )}
      </div>

      {msg && <div style={{ padding: 10, background: '#fef3c7', marginBottom: 15 }}>{msg}</div>}

      {/* Admin Add Product Form */}
      <div style={{ background: '#f9fafb', padding: 20, borderRadius: 8, marginBottom: 30 }}>
        <h3>Add New Product (Admin Operation)</h3>
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 10 }}>
          <input placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} required />
          <input placeholder="Price (USD)" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
          <input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} required />
          <textarea placeholder="Product Description" value={description} onChange={e => setDescription(e.target.value)} />
          <div>
            <label>Product Image Upload: </label>
            <input type="file" onChange={e => setImage(e.target.files[0])} />
          </div>
          <button type="submit" style={{ padding: 10, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Publish Product
          </button>
        </form>
      </div>

      {/* Product Catalog & Inline Management */}
      <h3>Catalog Management</h3>
      <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th>Image</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.image ? <img src={p.image} width="45" height="45" alt="" /> : 'None'}</td>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>
                <input
                  defaultValue={p.price}
                  style={{ width: 80 }}
                  onBlur={(e) => handlePriceUpdate(p.id, e.target.value)}
                />
              </td>
              <td>
                <button onClick={() => handleDelete(p.id)} style={{ color: '#dc2626', cursor: 'pointer' }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminHub;
