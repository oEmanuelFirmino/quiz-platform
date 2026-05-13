export function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  const getHeaders = (obj: any): string[] => {
    let headers: string[] = [];
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (obj[key] instanceof Date || (obj[key].toDate && typeof obj[key].toDate === 'function')) {
          headers.push(key);
        } else {
           const subHeaders = getHeaders(obj[key]);
           headers = headers.concat(subHeaders.map(h => `${key}.${h}`));
        }
      } else {
        headers.push(key);
      }
    }
    return headers;
  };

  const flattenObject = (obj: any, prefix = ''): any => {
    return Object.keys(obj).reduce((acc: any, k: string) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[k] === 'object' && obj[k] !== null) {
         if (obj[k].toDate && typeof obj[k].toDate === 'function') {
             acc[pre + k] = obj[k].toDate().toISOString();
         } else if (obj[k] instanceof Date) {
             acc[pre + k] = obj[k].toISOString();
         } else {
             Object.assign(acc, flattenObject(obj[k], pre + k));
         }
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const flattenedData = data.map(row => flattenObject(row));
  
  // Get all unique headers across all rows
  const headerSet = new Set<string>();
  flattenedData.forEach(row => {
    Object.keys(row).forEach(k => headerSet.add(k));
  });
  const headers = Array.from(headerSet);

  const csvRows = [
    headers.join(','), // Header row
  ];

  flattenedData.forEach(row => {
    const values = headers.map(header => {
      const escaped = ('' + (row[header] ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
