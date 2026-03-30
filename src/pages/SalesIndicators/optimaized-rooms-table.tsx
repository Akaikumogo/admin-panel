// 'use client';

// import { useEffect, useState, useMemo, useCallback, memo } from 'react';
// import { Image, Popover } from 'antd';
// import { FixedSizeGrid as Grid } from 'react-window';
// import roomImage from '@/assets/room.png';

// export type roomDto = {
//   _id: string;
//   block: 'block1' | 'block2' | 'block3' | 'block4';
//   floor: number;
//   room: number;
//   status: 'empty' | 'broned' | 'selled';
// };

// const generateMockRooms = (count: number, block: roomDto['block']): roomDto[] =>
//   Array.from({ length: count }, (_, i) => ({
//     _id: `${block}-${i + 1}`,
//     block,
//     floor: Math.floor(i / 5) + 1,
//     room: (i % 5) + 1,
//     status: ['empty', 'broned', 'selled'][
//       Math.floor(Math.random() * 3)
//     ] as roomDto['status']
//   }));

// // Memoized room card component
// const RoomCard = memo(
//   ({ apartment, index }: { apartment: roomDto; index: number }) => {
//     const getStatusStyles = useCallback((status: roomDto['status']) => {
//       switch (status) {
//         case 'empty':
//           return 'bg-gradient-to-br from-[#3d57c4] to-[#4f66cf] hover:from-[#4f66cf] hover:to-[#2f459f]';
//         case 'broned':
//           return 'bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600';
//         case 'selled':
//           return 'bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600';
//         default:
//           return 'bg-gray-400';
//       }
//     }, []);

//     const popoverContent = useMemo(
//       () => (
//         <div className="w-[300px]">
//           <div className="w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-3 flex items-center justify-center">
//             <Image
//               src={roomImage || '/placeholder.svg'}
//               alt="room"
//               width={150}
//               height={150}
//               preview={true}
//               className="w-[150px]"
//               loading="lazy"
//             />
//           </div>
//           <div>
//             <p className="text-lg font-bold">Xonadon: {apartment.room}</p>
//             <p>Qavat: {apartment.floor}</p>
//             <p>Status: {apartment.status}</p>
//             <p>Block: {apartment.block}</p>
//             <p>Narx: {apartment.floor}000 000$</p>
//           </div>
//         </div>
//       ),
//       [apartment]
//     );

//     return (
//       <Popover content={popoverContent} trigger="hover" mouseEnterDelay={0.3}>
//         <div
//           className={`w-[85px] rounded-xl h-[75px] cursor-pointer hover:scale-105 transition-transform ${getStatusStyles(
//             apartment.status
//           )}`}
//         >
//           <div className="flex items-center justify-center w-full h-full">
//             <h1 className="text-2xl font-bold text-white">{index + 1}</h1>
//           </div>
//         </div>
//       </Popover>
//     );
//   }
// );

// RoomCard.displayName = 'RoomCard';

// // Virtualized block component
// const VirtualizedBlock = memo(
//   ({
//     title,
//     blockRooms,
//     containerWidth
//   }: {
//     title: string;
//     blockRooms: roomDto[];
//     containerWidth: number;
//   }) => {
//     const ITEM_WIDTH = 95; // 85px + 10px gap
//     const ITEM_HEIGHT = 85; // 75px + 10px gap
//     const COLUMNS = 5;

//     const Cell = useCallback(
//       ({ columnIndex, rowIndex, style }: any) => {
//         const index = rowIndex * COLUMNS + columnIndex;
//         const apartment = blockRooms[index];

//         if (!apartment) return null;

//         return (
//           <div style={style} className="p-1">
//             <RoomCard apartment={apartment} index={index} />
//           </div>
//         );
//       },
//       [blockRooms]
//     );

//     const rowCount = Math.ceil(blockRooms.length / COLUMNS);

//     return (
//       <div className="w-[500px]">
//         <div className="w-full flex gap-1 text-center text-2xl font-bold mb-4">
//           <h1 className="text-slate-900 dark:text-white">{title}</h1>
//         </div>
//         <Grid
//           columnCount={COLUMNS}
//           columnWidth={ITEM_WIDTH}
//           height={Math.min(400, rowCount * ITEM_HEIGHT)} // Max height 400px
//           rowCount={rowCount}
//           rowHeight={ITEM_HEIGHT}
//           width={containerWidth}
//           overscanRowCount={2}
//           overscanColumnCount={1}
//         >
//           {Cell}
//         </Grid>
//       </div>
//     );
//   }
// );

// VirtualizedBlock.displayName = 'VirtualizedBlock';

// // Main optimized component
// const OptimizedRoomTable = () => {
//   const [allAppartments, setAllAppartments] = useState<roomDto[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     // Simulate async data loading
//     const loadData = async () => {
//       setIsLoading(true);

//       // Use setTimeout to prevent blocking
//       setTimeout(() => {
//         const mockData = [
//           ...generateMockRooms(42, 'block1'),
//           ...generateMockRooms(70, 'block2'),
//           ...generateMockRooms(48, 'block3'),
//           ...generateMockRooms(42, 'block4')
//         ];
//         setAllAppartments(mockData);
//         setIsLoading(false);
//       }, 100);
//     };

//     loadData();
//   }, []);

//   // Memoized filtered blocks
//   const blocks = useMemo(() => {
//     if (!allAppartments.length)
//       return { ablock: [], bblock: [], cblock: [], dblock: [] };

//     return {
//       ablock: allAppartments.filter((a) => a.block === 'block1'),
//       bblock: allAppartments.filter((a) => a.block === 'block2'),
//       cblock: allAppartments.filter((a) => a.block === 'block3'),
//       dblock: allAppartments.filter((a) => a.block === 'block4')
//     };
//   }, [allAppartments]);

//   if (isLoading) {
//     return <RoomTableSkeleton />;
//   }

//   return (
//     <div className="w-full h-full flex items-center justify-center rounded-lg">
//       <div className="relative overflow-auto flex flex-col gap-10 w-full h-full p-2">
//         <div className="grid grid-cols-2 xl:grid-cols-4 gap-[80px] w-fit mx-auto">
//           <VirtualizedBlock
//             title="Block A"
//             blockRooms={blocks.ablock}
//             containerWidth={480}
//           />
//           <VirtualizedBlock
//             title="Block B"
//             blockRooms={blocks.bblock}
//             containerWidth={480}
//           />
//           <VirtualizedBlock
//             title="Block C"
//             blockRooms={blocks.cblock}
//             containerWidth={480}
//           />
//           <VirtualizedBlock
//             title="Block D"
//             blockRooms={blocks.dblock}
//             containerWidth={480}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// // Skeleton component for loading state
// const RoomTableSkeleton = () => {
//   const SkeletonBlock = () => (
//     <div className="w-[500px]">
//       <div className="w-full flex gap-1 text-center text-2xl font-bold mb-4">
//         <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
//       </div>
//       <div className="grid grid-cols-5 gap-5">
//         {Array.from({ length: 15 }).map((_, i) => (
//           <div
//             key={i}
//             className="w-[85px] h-[75px] bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"
//           />
//         ))}
//       </div>
//     </div>
//   );

//   return (
//     <div className="w-full h-full flex items-center justify-center rounded-lg">
//       <div className="relative overflow-auto flex flex-col gap-10 w-full h-full p-2">
//         <div className="grid grid-cols-2 xl:grid-cols-4 gap-[80px] w-fit mx-auto">
//           <SkeletonBlock />
//           <SkeletonBlock />
//           <SkeletonBlock />
//           <SkeletonBlock />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OptimizedRoomTable;
