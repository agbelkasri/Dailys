import { SECTION_TYPES } from '../../constants/sections';
import { CustomerInventoryTable } from '../subtables/CustomerInventoryTable';
import { DowntimeTable } from '../subtables/DowntimeTable';
import { QualityTable } from '../subtables/QualityTable';

export function SubTable({ type, data, onChange, readOnly }) {
  switch (type) {
    case SECTION_TYPES.CUSTOMER_INVENTORY:
      return <CustomerInventoryTable data={data} onChange={onChange} readOnly={readOnly} />;
    case SECTION_TYPES.DOWNTIME:
      return <DowntimeTable data={data} onChange={onChange} readOnly={readOnly} />;
    case SECTION_TYPES.QUALITY:
      return <QualityTable data={data} onChange={onChange} readOnly={readOnly} />;
    default:
      return null;
  }
}
