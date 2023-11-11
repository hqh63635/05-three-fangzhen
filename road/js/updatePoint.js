export default function update(arr) {
    let newPoints = [];
    let vec = null;
    for (let i = 1; i < arr.length; i += 1) {
      if (i === 1) {
        newPoints.push({
          type: arr[i - 1].type,
          mouseDirection: arr[i - 1].mouseDirection,
          point: arr[i - 1].point,
        });
      }
      const { direction, distance } = this.getInfoBytwoPoint(
        arr[i - 1].point,
        arr[i].point
      );
      if (arr[i].type === "lineRoad") {
        const endPoint = this.getPointByVector(
          arr[i - 1].point,
          direction,
          distance
        );
        newPoints.push({
          type: arr[i].type,
          mouseDirection: arr[i].mouseDirection,
          point: endPoint,
        });
      } else {
        const { nextStartPoint } = this.createBend(
          arr[i - 2].point,
          arr[i - 1].point,
          this.width,
          arr[i].mouseDirection === "right",
          vec
        );
        newPoints.push({
          type: arr[i].type,
          mouseDirection: arr[i].mouseDirection,
          point: nextStartPoint,
        });
        arr.splice(i, 1, {
          type: arr[i].type,
          mouseDirection: arr[i].mouseDirection,
          point: nextStartPoint,
        })
      }
      if (arr[i].type === "lineRoad") {
        vec = direction;
      } else {
        const verticalVector = this.getVerticalVector(vec);
        const angle = Math.PI / 2;
        if (arr[i].mouseDirection === "right") {
          const quaternion = new THREE.Quaternion().setFromAxisAngle(
            verticalVector,
            angle
          );
          const rotatedVec = verticalVector.clone().applyQuaternion(quaternion); // 绕轴旋转后的向量
          // 给下一次的初始旋转向量赋值
          vec = rotatedVec;
        } else {
          const reverseVerticalVector = verticalVector.clone().negate();
          const angle = Math.PI / 2;
          const quaternion = new THREE.Quaternion().setFromAxisAngle(
            reverseVerticalVector,
            angle
          );
          // const v = new THREE.Vector3(1,0,0); // 原始向量
          const rotatedVec = reverseVerticalVector
            .clone()
            .applyQuaternion(quaternion); // 绕轴旋转后的向量
          // 旋转
          vec = rotatedVec;
        }
      }
    }
}