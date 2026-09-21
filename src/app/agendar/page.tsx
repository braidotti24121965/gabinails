export const dynamic = 'force-dynamic';
import { OnlineBooking } from "@/components/online-booking";
import { getProfessionals } from "@/lib/actions/professionals";
import { getServices } from "@/lib/actions/services";

export default async function AgendarPage() {
  const professionals = await getProfessionals();
  const allServices = await getServices();
  const services = allServices.filter(s => s.active !== false);
  return (
    <div className="min-h-screen bg-[#F0F4F8] sm:py-8">
      <OnlineBooking professionals={professionals} services={services} />
    </div>
  );
}
