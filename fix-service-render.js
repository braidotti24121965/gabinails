const fs = require('fs');
const path = 'src/components/nail-studio-app.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add saveService function
if (!content.includes('const saveService =')) {
  const saveProfessionalIndex = content.indexOf('const saveProfessional =');
  const saveService = `const saveService = async (data: any) => {
    if (!entityModal) return;
    if (entityModal.mode === "create") {
      const res = await createServiceRecord(data);
      if (res.success) {
        setServiceRows(current => [...current, { ...data, id: res.data?.id || "tmp", active: true }]);
        notify("Serviço salvo com sucesso.");
      } else {
        alert(res.error);
      }
    } else {
      // optimistic edit (no backend update yet, just for UI)
      setServiceRows(current => current.map((item, i) => i === entityModal.index ? { ...item, ...data } : item));
      notify("Serviço salvo com sucesso (local).");
    }
    setEntityModal(null);
  };\n  `;
  content = content.slice(0, saveProfessionalIndex) + saveService + content.slice(saveProfessionalIndex);
}

// 2. Add ServiceModal to the render block
const renderBlockOld = `      {entityModal && (
        entityModal.kind === "professional" ? (
          <ProfessionalModal
            mode={entityModal.mode}
            professional={entityModal.index !== undefined ? professionalRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveProfessional}
          />
        ) : (
          <EntityModal key={\`\${entityModal.kind}-\${entityModal.mode}-\${entityModal.index ?? "new"}\`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />
        )
      )}`;

const renderBlockNew = `      {entityModal && (
        entityModal.kind === "service" ? (
          <ServiceModal
            mode={entityModal.mode}
            service={entityModal.index !== undefined ? serviceRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveService}
          />
        ) : entityModal.kind === "professional" ? (
          <ProfessionalModal
            mode={entityModal.mode}
            professional={entityModal.index !== undefined ? professionalRows[entityModal.index] : undefined}
            close={() => setEntityModal(null)}
            save={saveProfessional}
          />
        ) : (
          <EntityModal key={\`\${entityModal.kind}-\${entityModal.mode}-\${entityModal.index ?? "new"}\`} state={entityModal} close={() => setEntityModal(null)} save={saveEntity} />
        )
      )}`;

content = content.replace(renderBlockOld, renderBlockNew);

fs.writeFileSync(path, content);
