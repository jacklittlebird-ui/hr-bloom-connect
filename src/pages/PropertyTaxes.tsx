import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PropertyTaxesManager } from '@/components/property-taxes/PropertyTaxesManager';

const PropertyTaxes = () => {
  return (
    <DashboardLayout>
      <PropertyTaxesManager />
    </DashboardLayout>
  );
};

export default PropertyTaxes;
