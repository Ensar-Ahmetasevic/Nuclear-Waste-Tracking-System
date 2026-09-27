-- Definitions must never cascade-delete operational Container Profiles.
ALTER TABLE "ContainerProfile" DROP CONSTRAINT "ContainerProfile_locationOriginId_fkey";
ALTER TABLE "ContainerProfile" ADD CONSTRAINT "ContainerProfile_locationOriginId_fkey" FOREIGN KEY ("locationOriginId") REFERENCES "LocationOrigin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContainerProfile" DROP CONSTRAINT "ContainerProfile_wasteProfileId_fkey";
ALTER TABLE "ContainerProfile" ADD CONSTRAINT "ContainerProfile_wasteProfileId_fkey" FOREIGN KEY ("wasteProfileId") REFERENCES "WasteProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WasteProfile" DROP CONSTRAINT "WasteProfile_containerTypeId_fkey";
ALTER TABLE "WasteProfile" ADD CONSTRAINT "WasteProfile_containerTypeId_fkey" FOREIGN KEY ("containerTypeId") REFERENCES "ContainerType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
